#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then echo 'A macOS machine with Xcode Command Line Tools is required to compile/sign/create the DMG.' >&2; exit 1; fi
APP="$PWD/artifacts/Keychain Simulator.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp macos/Info.plist "$APP/Contents/Info.plist"
rm -rf "$APP/Contents/Resources/preview"
cp -R preview "$APP/Contents/Resources/preview"
SDK=$(xcrun --sdk macosx --show-sdk-path)
for ARCH in arm64 x86_64; do
 xcrun swiftc macos/App.swift -swift-version 5 -O -sdk "$SDK" -target "$ARCH-apple-macos13.0" -framework Cocoa -framework WebKit -framework AVFoundation -framework Speech -o "$PWD/artifacts/KeychainSimulator-$ARCH"
done
lipo -create artifacts/KeychainSimulator-arm64 artifacts/KeychainSimulator-x86_64 -output "$APP/Contents/MacOS/KeychainSimulator"
cat > artifacts/entitlements.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>com.apple.security.device.audio-input</key><true/></dict></plist>
PLIST
codesign --force --sign - --entitlements artifacts/entitlements.plist "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cp macos/INSTALL.txt "$STAGE/READ ME FIRST.txt"
hdiutil create -volname 'Keychain Simulator' -srcfolder "$STAGE" -ov -format UDZO artifacts/Keychain-Simulator-macOS-universal.dmg
shasum -a 256 artifacts/Keychain-Simulator-macOS-universal.dmg > artifacts/SHA256SUMS.txt
