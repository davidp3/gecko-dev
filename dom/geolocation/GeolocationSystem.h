/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_GeolocationSystem_h
#define mozilla_dom_GeolocationSystem_h

#include "mozilla/MozPromise.h"
namespace mozilla::dom::geolocation {

// Value system settings promise resolves to when the user presses the cancel
// button.  See PresentSystemSettings.
const uint16_t kSystemPermissionCanceled = 0;

// Value system settings promise resolves to when permission was given.
// See PresentSystemSettings.
const uint16_t kSystemPermissionGranted = 1;

/**
 * If true then expect that the system will request permission from the user
 * when geolocation or wifi adapter access is requested.  This is not
 * guaranteed to be accurate on all platforms but should not return
 * false positives.
 */
bool SystemWillPromptForPermissionHint();

/**
 * If true, the system will grant access to either geolocation or wifi
 * adapter scanning (which is used by the geolocation fallback MLSFallback).
 * It won't need to bother the user (if it did, this would return false).
 * This is not guaranteed to be accurate on all platforms but should
 * not return false negatives.
 */
bool LocationIsPermittedHint();

using OpenSettingsPromise = MozPromise<bool, nsresult, false>;

/**
 * Opens the system settings application to the right spot and waits for the
 * user to give us geolocation permission.  Callers can reject the returned
 * promise to cancel listening for the settings change.
 */
already_AddRefed<OpenSettingsPromise::Private> PresentSystemSettings();

}  // namespace mozilla::dom::geolocation

#endif /* mozilla_dom_GeolocationSystem_h */
