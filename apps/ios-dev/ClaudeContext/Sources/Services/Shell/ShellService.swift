import Foundation

/// Shell command execution service for running terminal commands on device.
class ShellService {

    struct CommandResult {
        let stdout: String
        let stderr: String
        let exitCode: Int32
        var isSuccess: Bool { exitCode == 0 }
    }

    #if os(iOS)
    func execute(_ command: String, workingDirectory: String? = nil) async -> CommandResult {
        // iOS does not allow launching arbitrary shell processes.
        return CommandResult(stdout: "", stderr: "Shell execution unavailable on iOS", exitCode: -1)
    }
    #else
    func execute(_ command: String, workingDirectory: String? = nil) async -> CommandResult {
        await withCheckedContinuation { continuation in
            let process = Process()
            let outputPipe = Pipe()
            let errorPipe = Pipe()

            process.executableURL = URL(fileURLWithPath: "/bin/sh")
            process.arguments = ["-c", command]
            process.standardOutput = outputPipe
            process.standardError = errorPipe

            if let dir = workingDirectory {
                process.currentDirectoryURL = URL(fileURLWithPath: dir)
            }

            do {
                try process.run()
                process.waitUntilExit()

                let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()
                let errorData = errorPipe.fileHandleForReading.readDataToEndOfFile()

                continuation.resume(returning: CommandResult(
                    stdout: String(data: outputData, encoding: .utf8) ?? "",
                    stderr: String(data: errorData, encoding: .utf8) ?? "",
                    exitCode: process.terminationStatus
                ))
            } catch {
                continuation.resume(returning: CommandResult(
                    stdout: "",
                    stderr: error.localizedDescription,
                    exitCode: -1
                ))
            }
        }
    }
    #endif

    func isCommandAvailable(_ command: String) async -> Bool {
        let result = await execute("which \(command)")
        return result.isSuccess
    }

    func getGitConfig(_ key: String) async -> String {
        let result = await execute("git config --global \(key)")
        return result.isSuccess ? result.stdout.trimmingCharacters(in: .whitespacesAndNewlines) : ""
    }
}
