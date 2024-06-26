export const description = `
Tests limitations of copyTextureToBuffer in compat mode.
`;

import { makeTestGroup } from '../../../../../../common/framework/test_group.js';
import { kCompressedTextureFormats, kTextureFormatInfo } from '../../../../../format_info.js';
import { align } from '../../../../../util/math.js';
import { CompatibilityTest } from '../../../../compatibility_test.js';

export const g = makeTestGroup(CompatibilityTest);

g.test('compressed')
  .desc(`Tests that you can not call copyTextureToBuffer with compressed textures in compat mode.`)
  .params(u => u.combine('format', kCompressedTextureFormats))
  .beforeAllSubcases(t => {
    const { format } = t.params;
    t.selectDeviceOrSkipTestCase([kTextureFormatInfo[format].feature]);
  })
  .fn(t => {
    const { format } = t.params;

    const info = kTextureFormatInfo[format];

    const textureSize = [info.blockWidth, info.blockHeight, 1];
    const texture = t.device.createTexture({
      size: textureSize,
      format,
      usage: GPUTextureUsage.COPY_SRC,
    });
    t.trackForCleanup(texture);

    const bytesPerRow = align(info.color.bytes, 256);

    const buffer = t.device.createBuffer({
      size: bytesPerRow,
      usage: GPUBufferUsage.COPY_DST,
    });
    t.trackForCleanup(buffer);

    const encoder = t.device.createCommandEncoder();
    encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, textureSize);
    t.expectGPUError('validation', () => {
      encoder.finish();
    });
  });
