#pragma once
#include <stdint.h>

namespace keychain {
// Exactly eight primary states; only IDLE is enabled in milestone 1.
enum class State : uint8_t {
  IDLE, EXPRESSING, SHOWING_PHOTO, PLAYING_VOICE,
  LISTENING, WAITING_FOR_AI, SHOWING_RESPONSE, ERROR
};
enum class Event : uint8_t {
  BOOT, HOME_REQUESTED, CANCEL_REQUESTED, SHUTDOWN_REQUESTED,
  EXPRESSION_REQUESTED, EXPRESSION_FINISHED, PHOTO_SELECTED,
  NEXT_PHOTO, PREVIOUS_PHOTO, RANDOM_PHOTO, VOICE_MESSAGE_SELECTED,
  PLAYBACK_FINISHED, AUDIO_FAILURE, LISTENING_REQUESTED, INPUT_CAPTURED,
  RECORDING_TIMEOUT, MICROPHONE_FAILURE, AI_RESPONSE_RECEIVED,
  AI_REQUEST_FAILED, AI_REQUEST_TIMEOUT, NEXT_PAGE, PREVIOUS_PAGE,
  RETRY_REQUESTED, DISMISS_ERROR
};
enum class Result : uint8_t {
  ACCEPTED, NOT_STARTED, ALREADY_STARTED, NOT_IMPLEMENTED, INVALID_EVENT,
  UNSUPPORTED, REENTRANT
};
struct DebugRecord {
  uint32_t at;
  State from;
  State to;
  Event event;
  Result result;
  uint64_t generation;
};
// Side effects are injected. The manager neither draws nor reads buttons.
// Hooks must be short, non-blocking and must not dispatch another event.
struct Hooks {
  virtual ~Hooks() = default;
  virtual void exitIdle() = 0;
  virtual void cleanup() = 0;
  virtual void enterIdle(uint32_t now) = 0;
  virtual void debug(const DebugRecord& record) = 0;
};
class StateManager {
 public:
  explicit StateManager(Hooks& hooks) : hooks_(hooks) {}
  State current() const { return current_; }
  bool started() const { return started_; }
  uint64_t generation() const { return generation_; }

  Result begin(uint32_t now) {
    if (handling_) return Result::REENTRANT;
    handling_ = true;
    if (started_) {
      record(Event::BOOT, Result::ALREADY_STARTED, now);
      handling_ = false;
      return Result::ALREADY_STARTED;
    }
    started_ = true;
    ++generation_;
    hooks_.cleanup();
    hooks_.enterIdle(now);
    record(Event::BOOT, Result::ACCEPTED, now);
    handling_ = false;
    return Result::ACCEPTED;
  }

  Result dispatch(Event event, uint32_t now) {
    // Never recursively process events from a lifecycle/debug hook.
    if (handling_) return Result::REENTRANT;
    handling_ = true;
    Result result;
    if (!started_) result = Result::NOT_STARTED;
    else switch (event) {
      case Event::HOME_REQUESTED:
      case Event::CANCEL_REQUESTED:
        // Explicit self-reentry: cleanup and invalidate previous owner lifetime.
        // Later milestones use this same path to return from other states.
        hooks_.exitIdle();
        ++generation_;
        hooks_.cleanup();
        current_ = State::IDLE;
        hooks_.enterIdle(now);
        result = Result::ACCEPTED;
        break;
      case Event::EXPRESSION_REQUESTED:
      case Event::PHOTO_SELECTED:
      case Event::VOICE_MESSAGE_SELECTED:
      case Event::LISTENING_REQUESTED:
        result = Result::NOT_IMPLEMENTED;
        break;
      case Event::SHUTDOWN_REQUESTED:
        result = Result::UNSUPPORTED; // No power-control hardware in this demo.
        break;
      default:
        result = Result::INVALID_EVENT; // Includes unowned async completions.
        break;
    }
    record(event, result, now);
    handling_ = false;
    return result;
  }

 private:
  Result record(Event event, Result result, uint32_t now) {
    hooks_.debug({now, current_, current_, event, result, generation_});
    return result;
  }
  Hooks& hooks_;
  State current_ = State::IDLE;
  bool started_ = false;
  bool handling_ = false;
  uint64_t generation_ = 0;
};
} // namespace keychain
