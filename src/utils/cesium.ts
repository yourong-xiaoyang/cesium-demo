import * as Cesium from 'cesium'

export const initCesium = (container: HTMLDivElement): Cesium.Viewer => {
  return new Cesium.Viewer(container, {
    animation: true,
    baseLayerPicker: true,
    fullscreenButton: true,
    vrButton: false,
    geocoder: true,
    homeButton: true,
    infoBox: true,
    sceneModePicker: true,
    selectionIndicator: true,
    timeline: true,
    navigationHelpButton: true,
    navigationInstructionsInitiallyVisible: false,
    scene3DOnly: false,
    shouldAnimate: false
  })
}

export const destroyCesium = (viewer: Cesium.Viewer): void => {
  if (viewer && !viewer.isDestroyed()) {
    viewer.destroy()
  }
}
