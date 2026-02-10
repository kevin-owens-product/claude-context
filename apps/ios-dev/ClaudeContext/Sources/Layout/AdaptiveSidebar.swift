import SwiftUI

struct AdaptiveSidebar: View {
    @Binding var selectedItem: String
    let onFileSelected: (String) -> Void

    struct NavItem: Identifiable {
        let id: String
        let label: String
        let icon: String
        var badge: Int? = nil
    }

    let navItems: [NavItem] = [
        NavItem(id: "explorer", label: "Explorer", icon: "folder"),
        NavItem(id: "search", label: "Search", icon: "magnifyingglass"),
        NavItem(id: "git", label: "Source Control", icon: "arrow.triangle.branch"),
        NavItem(id: "debug", label: "Run & Debug", icon: "ladybug"),
        NavItem(id: "extensions", label: "Extensions", icon: "puzzlepiece.extension")
    ]

    struct FileNode: Identifiable {
        let id = UUID()
        let name: String
        let path: String
        let isDirectory: Bool
        var children: [FileNode] = []
    }

    @State private var sampleFiles: [FileNode] = [
        FileNode(name: "src", path: "/src", isDirectory: true, children: [
            FileNode(name: "main.kt", path: "/src/main.kt", isDirectory: false),
            FileNode(name: "App.kt", path: "/src/App.kt", isDirectory: false),
            FileNode(name: "utils", path: "/src/utils", isDirectory: true, children: [
                FileNode(name: "helpers.kt", path: "/src/utils/helpers.kt", isDirectory: false)
            ])
        ]),
        FileNode(name: "build.gradle.kts", path: "/build.gradle.kts", isDirectory: false),
        FileNode(name: "README.md", path: "/README.md", isDirectory: false)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("Claude Context")
                    .font(.headline)
                    .foregroundColor(.accentColor)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            Divider()

            // Navigation items
            ForEach(navItems) { item in
                Button {
                    selectedItem = item.id
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: item.icon)
                            .frame(width: 20)
                            .foregroundColor(selectedItem == item.id ? .accentColor : .secondary)

                        Text(item.label)
                            .foregroundColor(selectedItem == item.id ? .primary : .secondary)
                            .fontWeight(selectedItem == item.id ? .semibold : .regular)

                        Spacer()

                        if let badge = item.badge {
                            Text("\(badge)")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.red)
                                .foregroundColor(.white)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        selectedItem == item.id
                            ? Color.accentColor.opacity(0.1)
                            : Color.clear
                    )
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 8)
                .padding(.vertical, 1)
            }

            Divider()
                .padding(.vertical, 8)

            // File tree
            Text("FILES")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 16)
                .padding(.bottom, 4)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(sampleFiles) { node in
                        FileTreeItemView(node: node, depth: 0, onSelect: onFileSelected)
                    }
                }
            }

            Spacer()

            Divider()

            // Settings at bottom
            Button {
                selectedItem = "settings"
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "gear")
                        .frame(width: 20)
                    Text("Settings")
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(Color(.systemGroupedBackground))
    }
}

struct FileTreeItemView: View {
    let node: AdaptiveSidebar.FileNode
    let depth: Int
    let onSelect: (String) -> Void
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                if node.isDirectory {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } else {
                    onSelect(node.path)
                }
            } label: {
                HStack(spacing: 6) {
                    if node.isDirectory {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .frame(width: 12)
                    } else {
                        Spacer().frame(width: 12)
                    }

                    Image(systemName: node.isDirectory
                        ? (isExpanded ? "folder.fill" : "folder")
                        : "doc.text"
                    )
                    .font(.caption)
                    .foregroundColor(node.isDirectory ? .accentColor : .secondary)

                    Text(node.name)
                        .font(.caption)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Spacer()
                }
                .padding(.leading, CGFloat(depth * 16 + 16))
                .padding(.vertical, 4)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(node.children) { child in
                    FileTreeItemView(node: child, depth: depth + 1, onSelect: onSelect)
                }
            }
        }
    }
}
