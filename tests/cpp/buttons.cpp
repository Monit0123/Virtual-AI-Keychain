#include "../../wokwi/milestone-1-idle/Buttons.h"
#include <cassert>
#include <vector>
#include <cstdio>
using namespace keychain;
std::vector<Gesture> events;
void emit(Gesture g){events.push_back(g);}
int main(){
 Buttons b(emit);
 b.update(true,false,0);b.update(true,false,30);b.update(false,false,100);b.update(false,false,130);
 assert(events.size()==1&&events.back()==Gesture::A_SHORT);
 b.update(false,true,200);b.update(false,true,230);b.update(false,true,930);b.update(false,true,1930);b.update(false,false,2000);b.update(false,false,2030);
 assert(events.size()==2&&events.back()==Gesture::B_LONG);
 b.update(true,true,2100);b.update(true,true,2130);b.update(true,true,4000);b.update(false,true,4100);b.update(false,true,4130);b.update(false,false,4200);b.update(false,false,4230);
 assert(events.size()==3&&events.back()==Gesture::BOTH_HOME);
 Buttons wrap(emit);const uint32_t start=UINT32_MAX-100;
 wrap.update(true,false,start);wrap.update(true,false,start+30);wrap.update(true,false,uint32_t(start+730));
 assert(events.back()==Gesture::A_LONG);assert(events.size()==4);
 std::puts("C++ button debounce, short/long, chord and millis rollover checks passed.");
}
