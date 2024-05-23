/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Test that drag and drop events are sent at the right time and that
// they respect content analysis verdicts.
// Includes tests for dragging between domains, windows and iframes.
//
// Each source and target element is from one of the
// places in the following list:
//
// 0. ".org" domain, window/tab #1
// 1. window/tab #1 iframe in same domain
// 2. ".com" domain, window/tab #2
// 3. window/tab #2 iframe in same domain
//
// To avoid symmetric tests, the drag source must be in the first window.

"use strict";

/* eslint-disable @microsoft/sdl/no-insecure-url */

// Hold the non-mock CA service because we will need it and mockCA._genuine
// doesn't seem to get defined.
const realContentAnalysisService = SpecialPowers.Cc[
  "@mozilla.org/contentanalysis;1"
].getService(SpecialPowers.Ci.nsIContentAnalysis);

// outer-frame domains
const OUTER_BASE_1 = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "http://example.org"
);
const OUTER_BASE_2 = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "http://example.com"
);
// iframe domains
const INNER_BASE_1 = OUTER_BASE_1;
const INNER_BASE_2 = OUTER_BASE_2;

// The tabs, each in their own widget.
let tab1Cxt;
let tab2Cxt;

let dragServiceCid;

// JS controller for mock drag service
let dragController;

// Resolve fn for promise we resolve after mockCA.analyzeRemoteDropEvent runs.
let resolveDropPromise;

let mockCA = {
  isActive: true,
  caShouldAllow: undefined,

  async analyzeRemoteDropEvent(browsingContext) {
    info("Received analyzeRemoteDropEvent");
    // Async delay to simulate content analysis.
    await new Promise(res => setTimeout(res, 0));
    // Return the result to content using the non-mock CA object.
    realContentAnalysisService.sendDragEventVerdict(
      browsingContext,
      true /* isRemote */,
      this.caShouldAllow /* allow */
    );
    resolveDropPromise();
  },

  prepareForDropEventAnalysisRequest(_dataTransfer, _windowGlobalParent) {
    info("Ignoring prepareForDropEventAnalysisRequest");
  },
  cancelAllRequestsForDrop(_browsingContext) {
    info("Ignoring cancelAllRequestsForDrop");
  },
};

async function runDnd(sourceBrowsingCxt, targetBrowsingCxt, dndOptions = {}) {
  return EventUtils.synthesizeMockDragAndDrop({
    dragController,
    srcElement: "dropSource",
    targetElement: "dropTarget",
    sourceBrowsingCxt,
    targetBrowsingCxt,
    id: SpecialPowers.Ci.nsIDOMWindowUtils.DEFAULT_MOUSE_POINTER_ID,
    info,
    record,
    dragAction: Ci.nsIDragService.DRAGDROP_ACTION_MOVE,
    ...dndOptions,
  });
}

async function openWindow(tabIdx) {
  let win =
    tabIdx == 0 ? window : await BrowserTestUtils.openNewBrowserWindow();
  let url =
    (tabIdx == 0 ? OUTER_BASE_1 : OUTER_BASE_2) +
    "browser_content_analysis_dnd_outer.html";
  let tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser: win.gBrowser,
    url,
  });
  registerCleanupFunction(async function () {
    await BrowserTestUtils.removeTab(tab);
    if (tabIdx != 0) {
      await BrowserTestUtils.closeWindow(win);
    }
  });

  // Set the URL for the iframe.  Also set
  // neverAllowSessionIsSynthesizedForTests for both frames
  // (the second is redundant if they are in the same process).
  await SpecialPowers.spawn(
    tab.linkedBrowser.browsingContext,
    [tabIdx == 0 ? INNER_BASE_1 : INNER_BASE_2],
    iframeUrl => {
      content.document.getElementById("iframe").src =
        iframeUrl + "browser_content_analysis_dnd_inner.html";
      const ds = SpecialPowers.Cc[
        "@mozilla.org/widget/dragservice;1"
      ].getService(SpecialPowers.Ci.nsIDragService);
      ds.neverAllowSessionIsSynthesizedForTests = true;
    }
  );

  await SpecialPowers.spawn(
    tab.linkedBrowser.browsingContext.children[0],
    [],
    () => {
      const ds = SpecialPowers.Cc[
        "@mozilla.org/widget/dragservice;1"
      ].getService(SpecialPowers.Ci.nsIDragService);
      ds.neverAllowSessionIsSynthesizedForTests = true;
    }
  );

  return tab.linkedBrowser.browsingContext;
}

add_setup(async function () {
  const oldDragService = SpecialPowers.Cc[
    "@mozilla.org/widget/dragservice;1"
  ].getService(SpecialPowers.Ci.nsIDragService);
  dragController = oldDragService.getMockDragController();
  dragServiceCid = MockRegistrar.register(
    "@mozilla.org/widget/dragservice;1",
    dragController.mockDragService
  );
  ok(dragServiceCid, "MockDragService was registered");
  // If the mock failed then don't continue or else we could trigger native
  // DND behavior.
  if (!dragServiceCid) {
    SimpleTest.finish();
  }
  registerCleanupFunction(async function () {
    MockRegistrar.unregister(dragServiceCid);
  });
  dragController.mockDragService.neverAllowSessionIsSynthesizedForTests = true;

  tab1Cxt = await openWindow(0);
  tab2Cxt = await openWindow(1);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentanalysis.enabled", true]],
  });

  mockCA = mockContentAnalysisService(mockCA);
});

add_task(async function test_dnd_tab1_to_tab1() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt, tab1Cxt, {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_tab1_to_iframe1() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt, tab1Cxt.children[0], {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_tab1_to_tab2() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt, tab2Cxt, {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_tab1_to_iframe2() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt, tab2Cxt.children[0], {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_iframe1_to_tab1() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt.children[0], tab1Cxt, {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_iframe1_to_iframe1() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt.children[0], tab1Cxt.children[0], {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_iframe1_to_tab2() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt.children[0], tab2Cxt, {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});

add_task(async function test_dnd_iframe1_to_iframe2() {
  for (let caShouldAllow of [false, true]) {
    info(
      `Content analysis should grant permission: ${
        caShouldAllow ? "yes" : "no"
      }`
    );
    mockCA.caShouldAllow = caShouldAllow;
    let dropPromise = new Promise(res => {
      resolveDropPromise = res;
    });
    await runDnd(tab1Cxt.children[0], tab2Cxt.children[0], {
      dropPromise,
      expectDragLeave: !caShouldAllow,
    });
  }
});
