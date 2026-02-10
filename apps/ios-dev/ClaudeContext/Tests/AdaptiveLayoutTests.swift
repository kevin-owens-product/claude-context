import XCTest
@testable import ClaudeContext

class AdaptiveLayoutTests: XCTestCase {

    // MARK: - DeviceLayout Tests

    func testDeviceLayoutEquality() {
        XCTAssertEqual(DeviceLayout.compactPhone, DeviceLayout.compactPhone)
        XCTAssertEqual(DeviceLayout.tablet, DeviceLayout.tablet)
        XCTAssertNotEqual(DeviceLayout.compactPhone, DeviceLayout.tablet)
    }

    func testAllDeviceLayoutCases() {
        let layouts: [DeviceLayout] = [
            .compactPhone,
            .regularPhone,
            .tablet,
            .tabletSplitSmall,
            .tabletSplitLarge,
            .stageManager
        ]
        XCTAssertEqual(layouts.count, 6)
    }

    // MARK: - MultiWindowInfo Tests

    func testMultiWindowInfoDefaults() {
        let info = MultiWindowInfo(isMainScene: true, windowId: "main")
        XCTAssertTrue(info.isMainScene)
        XCTAssertEqual(info.windowId, "main")
    }

    func testMultiWindowInfoSecondary() {
        let info = MultiWindowInfo(isMainScene: false, windowId: "secondary-123")
        XCTAssertFalse(info.isMainScene)
        XCTAssertEqual(info.windowId, "secondary-123")
    }

    func testMultiWindowInfoFromNilScene() {
        let info = MultiWindowInfo.from(nil)
        XCTAssertTrue(info.isMainScene)
        XCTAssertEqual(info.windowId, "main")
    }

    // MARK: - AdaptiveNavigation Tabs Tests

    func testNavigationTabCount() {
        let tabs = AdaptiveNavigation<EmptyView>.tabs
        XCTAssertEqual(tabs.count, 5)
    }

    func testNavigationTabRoutes() {
        let tabs = AdaptiveNavigation<EmptyView>.tabs
        XCTAssertEqual(tabs[0].id, "projects")
        XCTAssertEqual(tabs[1].id, "editor")
        XCTAssertEqual(tabs[2].id, "terminal")
        XCTAssertEqual(tabs[3].id, "git")
        XCTAssertEqual(tabs[4].id, "settings")
    }

    func testNavigationTabLabels() {
        let tabs = AdaptiveNavigation<EmptyView>.tabs
        XCTAssertEqual(tabs[0].label, "Projects")
        XCTAssertEqual(tabs[1].label, "Editor")
    }

    // MARK: - Sidebar NavItem Tests

    func testSidebarNavItemDefaults() {
        let sidebar = AdaptiveSidebar(selectedItem: .constant("explorer"), onFileSelected: { _ in })
        XCTAssertEqual(sidebar.navItems.count, 5)
        XCTAssertEqual(sidebar.navItems[0].id, "explorer")
        XCTAssertEqual(sidebar.navItems[0].label, "Explorer")
    }

    func testSidebarNavItemBadgeDefault() {
        let item = AdaptiveSidebar.NavItem(id: "test", label: "Test", icon: "star")
        XCTAssertNil(item.badge)
    }

    func testSidebarNavItemWithBadge() {
        let item = AdaptiveSidebar.NavItem(id: "test", label: "Test", icon: "star", badge: 5)
        XCTAssertEqual(item.badge, 5)
    }

    // MARK: - FileNode Tests

    func testFileNodeDirectory() {
        let node = AdaptiveSidebar.FileNode(name: "src", path: "/src", isDirectory: true)
        XCTAssertTrue(node.isDirectory)
        XCTAssertTrue(node.children.isEmpty)
    }

    func testFileNodeFile() {
        let node = AdaptiveSidebar.FileNode(name: "main.kt", path: "/main.kt", isDirectory: false)
        XCTAssertFalse(node.isDirectory)
    }

    func testFileNodeWithChildren() {
        let child = AdaptiveSidebar.FileNode(name: "child.kt", path: "/src/child.kt", isDirectory: false)
        let parent = AdaptiveSidebar.FileNode(name: "src", path: "/src", isDirectory: true, children: [child])
        XCTAssertEqual(parent.children.count, 1)
        XCTAssertEqual(parent.children[0].name, "child.kt")
    }
}
