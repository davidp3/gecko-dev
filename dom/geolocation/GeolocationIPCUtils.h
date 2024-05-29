/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_GeolocationIPCUtils_h
#define mozilla_dom_GeolocationIPCUtils_h

#include "ipc/EnumSerializer.h"

namespace mozilla::dom::geolocation {
enum class LocationOSPermission {
  eSystemWillPromptForPermission,
  eLocationIsPermitted,
  eLocationNotPermitted,
  eLastLocationOSPermission = eLocationNotPermitted
};
}

namespace IPC {
template <>
struct ParamTraits<mozilla::dom::geolocation::LocationOSPermission>
    : public ContiguousEnumSerializerInclusive<
          mozilla::dom::geolocation::LocationOSPermission,
          mozilla::dom::geolocation::LocationOSPermission::
              eSystemWillPromptForPermission,
          mozilla::dom::geolocation::LocationOSPermission::
              eLastLocationOSPermission> {};
}  // namespace IPC

#endif /* mozilla_dom_GeolocationIPCUtils_h */
