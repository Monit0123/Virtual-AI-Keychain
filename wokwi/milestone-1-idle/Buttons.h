#pragma once
#include <stdint.h>
namespace keychain {
enum class Gesture : uint8_t { A_SHORT, A_LONG, B_SHORT, B_LONG, BOTH_HOME };
class Buttons {
 public:
  using Callback = void (*)(Gesture);
  explicit Buttons(Callback callback) : callback_(callback) {}
  void update(bool a, bool b, uint32_t now) {
    const bool raw[2] = {a,b};
    bool released[2] = {false,false};
    for (int i=0;i<2;++i) {
      auto& k=keys_[i];
      if(raw[i]!=k.raw){k.raw=raw[i];k.changed=now;}
      if(k.stable!=k.raw && uint32_t(now-k.changed)>=30){
        k.stable=k.raw;
        if(k.stable){k.downAt=now;k.sent=false;k.suppressed=chord_;}
        else released[i]=true;
      }
    }
    if(keys_[0].stable&&keys_[1].stable&&!chord_){
      chord_=true;keys_[0].suppressed=keys_[1].suppressed=true;
      callback_(Gesture::BOTH_HOME);
    }
    for(int i=0;i<2;++i){
      auto& k=keys_[i];
      if(released[i]&&!chord_&&!k.sent&&!k.suppressed)
        callback_(i==0?Gesture::A_SHORT:Gesture::B_SHORT);
      if(k.stable&&!chord_&&!k.sent&&!k.suppressed&&uint32_t(now-k.downAt)>=700){
        k.sent=true;callback_(i==0?Gesture::A_LONG:Gesture::B_LONG);
      }
    }
    if(!keys_[0].stable&&!keys_[1].stable)chord_=false;
  }
  bool pressed(int i) const { return keys_[i].stable; }
  uint32_t heldMs(int i,uint32_t now) const { return keys_[i].stable?uint32_t(now-keys_[i].downAt):0; }
 private:
  struct Key {bool raw=false,stable=false,sent=false,suppressed=false;uint32_t changed=0,downAt=0;};
  Key keys_[2]; bool chord_=false; Callback callback_;
};
}
