import Cocoa
import WebKit
import AVFoundation
import Speech

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKURLSchemeHandler, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let engine = AVAudioEngine()
    var speechRequest: SFSpeechAudioBufferRecognitionRequest?
    var speechTask: SFSpeechRecognitionTask?
    var speechSession: Int?
    var tapInstalled = false
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    let assets = Bundle.main.resourceURL!.appendingPathComponent("preview")
    lazy var recordings: URL = {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("VirtualKeychain/recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root
    }()
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "keychain")
        config.setURLSchemeHandler(self, forURLScheme: "keychain")
        config.mediaTypesRequiringUserActionForPlayback = []
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1100, height: 850), styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
        window.title = "Virtual AI Keychain — Mac Simulator"
        window.contentView = web
        window.center()
        window.makeKeyAndOrderFront(nil)
        let menu = NSMenu(); let item = NSMenuItem(); menu.addItem(item)
        let appMenu = NSMenu(); item.submenu = appMenu
        appMenu.addItem(withTitle: "Quit Keychain Simulator", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let edit = NSMenuItem(); menu.addItem(edit); edit.submenu = NSMenu(title: "Edit")
        for (title, selector, key) in [("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            edit.submenu?.addItem(withTitle: title, action: Selector(selector), keyEquivalent: key)
        }
        NSApp.mainMenu = menu
        web.load(URLRequest(url: URL(string: "keychain://app/index.html")!))
        NSApp.activate(ignoringOtherApps: true)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard CommandLine.arguments.contains("--smoke-test") else { return }
        let script = """
        if (!window.KeychainDesktop) throw new Error('Native bridge not installed');
        if (companion.state !== 'IDLE') throw new Error('Controller not idle');
        await realAudio.unlock();
        const loaded = await realAudio.preload();
        if (loaded.length !== 4 || !loaded.every(x=>x.ok)) throw new Error('Bundled WAV decoding failed: '+JSON.stringify(loaded));
        const bytes = await (await fetch('voice/voice_001.wav')).arrayBuffer();
        await KeychainDesktop.saveAudio('voice_004',bytes);
        await KeychainDesktop.restoreAudio(realAudio);
        if (!realAudio.personalIds.has('voice_004') || Math.abs(realAudio.buffers.get('voice_004').duration-17.116)>0.02) throw new Error('Persistent recording restore failed');
        const started = greetingAudio.start(performance.now());
        if (!started.ok) throw new Error('Greeting failed: '+started.message);
        await new Promise(resolve=>setTimeout(resolve,200));
        if(greetingAudio.player.session?.status!=='playing') throw new Error('Web Audio output did not enter playing state');
        greetingAudio.stop();
        return 'PASS: native bridge, UI, four WAV decodes, persistent audio import/restore, Web Audio source start/cancel';
        """
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, contentWorld: .page) { result in
            switch result {
            case .success(let value):
                print(value)
                try? FileManager.default.removeItem(at: self.audioURL("voice_004"))
                exit(0)
            case .failure(let error):
                fputs("NATIVE SMOKE FAILED: \(error)\n", stderr)
                exit(1)
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now()+45) { fputs("Native smoke test timed out\n", stderr); exit(1) }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { stopSpeech() }
    func send(_ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { self.web.evaluateJavaScript("window.KeychainDesktop?.receive(\(json))", completionHandler: nil) }
    }
    func event(_ session: Int, _ kind: String, _ text: String = "", final: Bool = false) {
        send(["event": "speech", "session": session, "kind": kind, "text": text, "final": final])
    }
    func stopSpeech() {
        speechSession = nil
        engine.stop()
        if tapInstalled { engine.inputNode.removeTap(onBus: 0); tapInstalled = false }
        speechRequest?.endAudio(); speechTask?.cancel()
        speechTask = nil; speechRequest = nil
    }
    func startSpeech(session: Int, online: Bool) {
        stopSpeech(); speechSession = session
        AVCaptureDevice.requestAccess(for: .audio) { mic in
            SFSpeechRecognizer.requestAuthorization { auth in
                DispatchQueue.main.async {
                    guard self.speechSession == session else { return }
                    guard mic && auth == .authorized else {
                        self.stopSpeech(); self.event(session, "error", "macOS denied Microphone or Speech Recognition. Enable both for Keychain Simulator in System Settings → Privacy & Security, then restart the app."); return
                    }
                    self.beginSpeech(session: session, online: online)
                }
            }
        }
    }
    func beginSpeech(session: Int, online: Bool) {
        guard let recognizer = recognizer, recognizer.isAvailable else {
            stopSpeech(); event(session, "error", "Apple English speech recognizer is unavailable on this Mac."); return
        }
        guard online || recognizer.supportsOnDeviceRecognition else {
            stopSpeech(); event(session, "error", "On-device English recognition is unavailable. Install supported language resources or explicitly enable Apple speech service. No online fallback was used."); return
        }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = !online
        request.shouldReportPartialResults = true
        request.contextualStrings = ["Moni", "Hi Moni", "Hi Daddy"]
        speechRequest = request
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 && format.channelCount > 0 else {
            stopSpeech(); event(session, "error", "No usable microphone input. Check macOS Sound → Input."); return
        }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
        tapInstalled = true
        speechTask = recognizer.recognitionTask(with: request) { result, error in
            DispatchQueue.main.async {
                guard self.speechSession == session else { return }
                if let result = result {
                    let text = result.bestTranscription.formattedString
                    // A complete wake phrase may be recognized in a partial hypothesis;
                    // report it as final to the adapter, which stops capture before output.
                    let normalized = text.lowercased().replacingOccurrences(of: "[^a-z ]", with: " ", options: .regularExpression).split(separator: " ").joined(separator: " ")
                    let wake = ["moni", "hi moni", "hi daddy"].contains(normalized)
                    self.event(session, "result", text, final: result.isFinal || wake)
                    if result.isFinal { self.stopSpeech(); self.event(session, "end") }
                } else if let error = error {
                    self.stopSpeech(); self.event(session, "error", error.localizedDescription)
                }
            }
        }
        do { engine.prepare(); try engine.start(); event(session, "start") }
        catch { stopSpeech(); event(session, "error", error.localizedDescription) }
    }
    func audioURL(_ id: String) throws -> URL {
        guard id.range(of: "^voice_[0-9]{3,}$", options: .regularExpression) != nil else {
            throw NSError(domain: "Keychain", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid recording ID"])
        }
        return recordings.appendingPathComponent(id + ".audio")
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "keychain",
              let args = message.body as? [String: Any], let op = args["op"] as? String, let requestID = args["requestId"] as? Int else { return }
        func reply(_ value: Any) { send(["requestId": requestID, "value": value]) }
        do {
            switch op {
            case "speechStart":
                guard let session = args["session"] as? Int else { return }
                startSpeech(session: session, online: args["allowOnline"] as? Bool ?? false); reply(true)
            case "speechStop":
                if speechSession == args["session"] as? Int { stopSpeech() }; reply(true)
            case "micCheck":
                AVCaptureDevice.requestAccess(for: .audio) { allowed in
                    self.send(["requestId": requestID, "value": allowed ? "macOS microphone permission granted. Start listening to test actual pickup and Apple Speech recognition." : "macOS microphone permission denied. Enable Keychain Simulator in System Settings → Privacy & Security → Microphone."])
                }
            case "audioList":
                let names = try FileManager.default.contentsOfDirectory(atPath: recordings.path)
                reply(names.filter { $0.hasSuffix(".audio") }.map { String($0.dropLast(6)) }.sorted())
            case "audioLoad":
                let url = try audioURL(args["id"] as? String ?? "")
                reply(try Data(contentsOf: url).base64EncodedString())
            case "audioSave":
                let url = try audioURL(args["id"] as? String ?? "")
                guard let text = args["data"] as? String, text.count <= 56 * 1024 * 1024,
                      let data = Data(base64Encoded: text), data.count <= 40 * 1024 * 1024 else {
                    throw NSError(domain: "Keychain", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid recording or file exceeds 40 MiB"])
                }
                try data.write(to: url, options: .atomic); reply(true)
            default: throw NSError(domain: "Keychain", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unknown native request"])
            }
        } catch { send(["requestId": requestID, "error": error.localizedDescription]) }
    }
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, url.host == "app" else { return }
        let path = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = assets.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(assets.path + "/"), let data = try? Data(contentsOf: file) else {
            urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorFileDoesNotExist)); return
        }
        let types = ["html": "text/html", "js": "application/javascript", "css": "text/css", "wav": "audio/wav", "jpg": "image/jpeg", "png": "image/png", "json": "application/json"]
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: types[file.pathExtension] ?? "application/octet-stream", expectedContentLength: data.count, textEncodingName: nil))
        urlSchemeTask.didReceive(data); urlSchemeTask.didFinish()
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.scheme == "keychain" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel(); panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories; panel.canChooseFiles = true
        panel.beginSheetModal(for: window) { result in completionHandler(result == .OK ? panel.urls : nil) }
    }
}
let app = NSApplication.shared
let delegate = App()
app.setActivationPolicy(.regular)
app.delegate = delegate
app.run()
