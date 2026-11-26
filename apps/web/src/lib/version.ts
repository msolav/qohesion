import { versionInfo } from "@qohesion/engine";

/** Version of this build. The number comes from the VERSION file; commit and date are set by the build. */
export const build = versionInfo(__QOHESION_VERSION__, {
  commit: __QOHESION_COMMIT__,
  builtAt: __QOHESION_BUILT_AT__,
});
