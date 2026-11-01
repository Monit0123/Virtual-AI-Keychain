#include "../../wokwi/milestone-1-idle/AppState.h"
#include <cassert>
#include <cstdio>
#include <vector>
#include <string>
using namespace keychain;
struct FakeHooks : Hooks {
  std::vector<std::string> calls;
  std::vector<DebugRecord> logs;
  StateManager* manager = nullptr;
  bool testReentry = false;
  void exitIdle() override { calls.push_back("exit"); }
  void cleanup() override { calls.push_back("cleanup"); }
  void enterIdle(uint32_t) override {
    calls.push_back("enter");
    if (testReentry) assert(manager->dispatch(Event::HOME_REQUESTED, 0) == Result::REENTRANT);
  }
  void debug(const DebugRecord& r) override {
    logs.push_back(r);
    if (testReentry) assert(manager->begin(0) == Result::REENTRANT);
  }
};
int main() {
  FakeHooks hooks;
  StateManager app(hooks);
  hooks.manager = &app;
  assert(!app.started());
  assert(app.dispatch(Event::HOME_REQUESTED, 0) == Result::NOT_STARTED);
  assert(hooks.calls.empty());
  hooks.testReentry = true;
  assert(app.begin(10) == Result::ACCEPTED);
  assert(app.current() == State::IDLE && app.started());
  assert((hooks.calls == std::vector<std::string>{"cleanup", "enter"}));
  const auto generation = app.generation();
  assert(app.begin(11) == Result::ALREADY_STARTED);
  assert(hooks.calls.size() == 2);
  for (auto event : {Event::EXPRESSION_REQUESTED, Event::PHOTO_SELECTED,
                     Event::VOICE_MESSAGE_SELECTED, Event::LISTENING_REQUESTED}) {
    assert(app.dispatch(event, 12) == Result::NOT_IMPLEMENTED);
    assert(app.current() == State::IDLE && app.generation() == generation);
  }
  for (auto event : {Event::AI_RESPONSE_RECEIVED, Event::AI_REQUEST_FAILED,
                     Event::PLAYBACK_FINISHED, Event::EXPRESSION_FINISHED,
                     static_cast<Event>(255)}) {
    assert(app.dispatch(event, 13) == Result::INVALID_EVENT);
    assert(app.current() == State::IDLE);
  }
  assert(app.dispatch(Event::SHUTDOWN_REQUESTED, 14) == Result::UNSUPPORTED);
  for (auto event : {Event::HOME_REQUESTED, Event::CANCEL_REQUESTED}) {
    hooks.calls.clear();
    assert(app.dispatch(event, 15) == Result::ACCEPTED);
    assert((hooks.calls == std::vector<std::string>{"exit", "cleanup", "enter"}));
  }
  assert(app.generation() == generation + 2);
  // Repeated interactions and millis wrap do not affect event validation.
  for (unsigned i = 0; i < 10000; ++i) {
    app.dispatch(Event::HOME_REQUESTED, UINT32_MAX - i);
    assert(app.current() == State::IDLE);
  }
  for (const auto& r : hooks.logs) assert(r.from == State::IDLE && r.to == State::IDLE);
  std::puts("Milestone 1: all C++ state-manager assertions passed (including 10,000 home events).");
}
