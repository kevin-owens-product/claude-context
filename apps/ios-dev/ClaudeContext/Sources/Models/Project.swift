import Foundation

struct Project: Identifiable, Codable {
    let id: UUID
    var name: String
    var path: String
    var language: ProjectLanguage
    var lastOpened: Date
    var gitBranch: String?
    var description: String?

    init(name: String, path: String, language: ProjectLanguage = .unknown) {
        self.id = UUID()
        self.name = name
        self.path = path
        self.language = language
        self.lastOpened = Date()
    }
}

enum ProjectLanguage: String, Codable, CaseIterable {
    case swift
    case kotlin
    case python
    case javascript
    case typescript
    case rust
    case go
    case java
    case cpp
    case c
    case ruby
    case unknown

    var displayName: String {
        switch self {
        case .swift: return "Swift"
        case .kotlin: return "Kotlin"
        case .python: return "Python"
        case .javascript: return "JavaScript"
        case .typescript: return "TypeScript"
        case .rust: return "Rust"
        case .go: return "Go"
        case .java: return "Java"
        case .cpp: return "C++"
        case .c: return "C"
        case .ruby: return "Ruby"
        case .unknown: return "Unknown"
        }
    }

    var fileExtensions: [String] {
        switch self {
        case .swift: return ["swift"]
        case .kotlin: return ["kt", "kts"]
        case .python: return ["py"]
        case .javascript: return ["js", "jsx", "mjs"]
        case .typescript: return ["ts", "tsx"]
        case .rust: return ["rs"]
        case .go: return ["go"]
        case .java: return ["java"]
        case .cpp: return ["cpp", "cc", "cxx", "hpp", "h"]
        case .c: return ["c", "h"]
        case .ruby: return ["rb"]
        case .unknown: return []
        }
    }
}

struct FileNode: Identifiable {
    let id = UUID()
    let name: String
    let path: String
    let isDirectory: Bool
    var children: [FileNode]?
    var isExpanded: Bool = false

    var fileExtension: String {
        (name as NSString).pathExtension
    }

    var iconName: String {
        if isDirectory {
            return isExpanded ? "folder.fill" : "folder"
        }
        switch fileExtension {
        case "swift": return "swift"
        case "kt", "java": return "chevron.left.forwardslash.chevron.right"
        case "py": return "chevron.left.forwardslash.chevron.right"
        case "js", "ts", "jsx", "tsx": return "chevron.left.forwardslash.chevron.right"
        case "json": return "curlybraces"
        case "md": return "doc.text"
        case "yml", "yaml": return "list.bullet"
        default: return "doc"
        }
    }
}
