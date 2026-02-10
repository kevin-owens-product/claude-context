// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "ClaudeContext",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "ClaudeContext",
            targets: ["ClaudeContext"]
        ),
    ],
    targets: [
        .target(
            name: "ClaudeContext",
            path: "Sources"
        ),
        .testTarget(
            name: "ClaudeContextTests",
            dependencies: ["ClaudeContext"],
            path: "Tests"
        ),
    ]
)
