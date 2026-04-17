<template>
  <div ref="cesiumContainer" class="cesium-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import {  Ion } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'

const cesiumContainer = ref<HTMLDivElement | null>(null)
let viewer: Cesium.Viewer | null = null

// 封装函数：在指定中心点附近生成随机航线
function createDrone(id: number, centerLon: number, centerLat: number): Cesium.Entity {

    
    viewer!.clock.shouldAnimate = true; 

    const start = Cesium.JulianDate.fromDate(new Date());
    const stop = Cesium.JulianDate.addSeconds(start, 60, new Cesium.JulianDate());

    // 第二步：把这两个具体值给到时钟
    viewer!.clock.startTime = start.clone();
    viewer!.clock.stopTime = stop.clone();
    viewer!.clock.currentTime = start.clone(); // 这一步最重要，把时间拨回起点

    const positionProperty = new Cesium.SampledPositionProperty();
    
    // 生成随机的飞行偏离值 (约正负2公里内)
    const offsetLon = (Math.random() - 0.5) * 0.03;
    const offsetLat = (Math.random() - 0.5) * 0.03;
    const baseHeight = 50 + Math.random() * 50; // 随机高度 50-100米

    // 航点 1
    positionProperty.addSample(start, Cesium.Cartesian3.fromDegrees(centerLon + offsetLon, centerLat + offsetLat, baseHeight));
    // 航点 2 (30秒后随机移动)
    const midTime = Cesium.JulianDate.addSeconds(start, 30, new Cesium.JulianDate());
    positionProperty.addSample(midTime, Cesium.Cartesian3.fromDegrees(centerLon + offsetLon - 0.01, centerLat + offsetLat + 0.01, baseHeight));
    // 航点 3
    positionProperty.addSample(stop, Cesium.Cartesian3.fromDegrees(centerLon + offsetLon - 0.02, centerLat + offsetLat, baseHeight));

    positionProperty.setInterpolationOptions({
        interpolationDegree: 2,
        interpolationAlgorithm: Cesium.HermitePolynomialApproximation
    });

    // 创建飞机实体
    const drone: Cesium.Entity = viewer!.entities.add({
        id: 'drone-' + id,
        position: positionProperty,
        orientation: new Cesium.VelocityOrientationProperty(positionProperty),
        model: {
            uri: '/public/Cesium_Air.glb',
            minimumPixelSize: 32 // 100架时调小点，防止满屏都是飞机
        },
        path: {
            width: 2,
            material: Cesium.Color.fromRandom({ alpha: 0.6 }) // 随机颜色
        },
        ellipse: {
            // 这是一个平面的圆，代表地面投影缓冲区
            semiMinorAxis: 200.0, // 半径 500 米
            semiMajorAxis: 200.0,
            material: Cesium.Color.CYAN.withAlpha(0.2), // 半透明青色，科技感
            outline: true,
            outlineColor: Cesium.Color.CYAN,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND // 贴在地面上
        },
        // ellipsoid: {
        //     // radii 接收一个 Cartesian3，三个值相等即为球体
        //     radii: new Cesium.Cartesian3(200.0, 200.0, 200.0), 
        //     material: Cesium.Color.RED.withAlpha(0.1),
        //     outline: true,
        //     outlineColor: Cesium.Color.RED
        // }
    });


    return drone;
}



onMounted(async () => {
  if (!cesiumContainer.value) {
    return
  }
  Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NGNkOGJkZi1lNzgzLTRjZTUtOWNjZi0xZDczODU4YjkwYzIiLCJpZCI6NDE1MTIxLCJpYXQiOjE3NzU2MTIzNzd9.BIHiw_-CaYLS4gaWZKVCHYvqrjB-GZTfVY-NXPyOfcM';
  viewer = new Cesium.Viewer(cesiumContainer.value, {
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
    shouldAnimate: false,
    terrain: Cesium.Terrain.fromWorldTerrain()
  } as any)

//   try {
//       const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188); // 墨尔本城市模型
//       viewer.scene.primitives.add(tileset);
//       viewer.zoomTo(tileset);
//   } catch (error) {
//       console.log(`加载失败: ${error}`);
//   }
//  return 

  // viewer.imageryLayers.remove(viewer.imageryLayers.get(0));

  // 添加高德矢量地图信息
  // const gdVectorProvider = new Cesium.UrlTemplateImageryProvider({
  //     url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
  //     maximumLevel: 18,
  // });
  // viewer.imageryLayers.addImageryProvider(gdVectorProvider);  


  // viewer.imageryLayers.addImageryProvider(await IonImageryProvider.fromAssetId(3954));

  // 添加高德地图影像图层
  // let gdImageryProvider = new Cesium.UrlTemplateImageryProvider({
  //     url: "https://webst01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=6&x={x}&y={y}&z={z}",
  //     maximumLevel: 18,
  // });
  // viewer.imageryLayers.addImageryProvider(gdImageryProvider);  

  // 存储所有飞机和射线的数组
  const droneList: Cesium.Entity[] = [];
  const rayList: Cesium.Entity[] = [];
  let dangerCount = 0; // 实时危险统计

  // 1. 修改循环生成逻辑
  for (let i = 0; i < 10; i++) {
      const drone = createDrone(i, 120.4795, 36.1012);
      droneList.push(drone);
      
      const rayLength = 1000.0; // 探测距离：1000米
      let intersectionPoint = new Cesium.Cartesian3(); // 记录交点

      // 为每架飞机预创一条射线实体（初始不显示）
      const rayEntity = viewer!.entities.add({
          polyline: {
              positions: new Cesium.CallbackProperty((time) => {
                const curPos = drone.position?.getValue(time);
                const curOri = drone.orientation?.getValue(time);
                if (!curPos || !curOri) return [];

                // 计算朝向向量
                const matrix = Cesium.Matrix3.fromQuaternion(curOri, new Cesium.Matrix3());
                const scratchDirection = new Cesium.Cartesian3();
                const dir = Cesium.Matrix3.multiplyByVector(matrix, Cesium.Cartesian3.UNIT_X, scratchDirection);

                const offsetStep = Cesium.Cartesian3.multiplyByScalar(dir, 7.0, new Cesium.Cartesian3());
                const rayStartPos = Cesium.Cartesian3.add(curPos, offsetStep, new Cesium.Cartesian3());

                
                // 探测
                const ray = new Cesium.Ray(rayStartPos, dir);
                // const result = viewer!.scene.globe.pick(ray, viewer!.scene);
                const result = (viewer!.scene as any).pickFromRay(ray); 

                // if (result) {
                //     return [curPos, result];
                // } else {
                //     return [curPos, Cesium.Ray.getPoint(ray, 500)]; // 没撞到就画500米
                // }
                if (Cesium.defined(result) && Cesium.defined(result.position)) {
                  intersectionPoint = result.position;
                  const distance = Cesium.Cartesian3.distance(curPos, result.position);
                  
                  // 如果距离小于500米，显示为红线，否则绿线
                  (rayEntity.polyline as any).material = distance < 500 ? Cesium.Color.RED : Cesium.Color.GREEN;
                  if (distance < 500) {
                    dangerCount++;
                  }
                  return [curPos, intersectionPoint];
              } else {
                  // 如果没撞到山，就画一根指定长度的虚线
                  const endPos = Cesium.Ray.getPoint(ray, rayLength);
                  (rayEntity.polyline as any).material = Cesium.Color.GREEN.withAlpha(0.5);
                  return [curPos, endPos];
              }
            }, false),
              width: 2,
              material: Cesium.Color.GREEN.withAlpha(0.5),
              show: true
          }
      });
      rayList.push(rayEntity);
  }

  // 2. 每一帧统一计算所有飞机的射线碰撞
  // viewer!.scene.preRender.addEventListener(() => {
  //     const now = viewer!.clock.currentTime;
  //     let currentDanger = 0;

  //     droneList.forEach((drone, index) => {
  //         const rayEntity = rayList[index];
  //         const position = drone.position!.getValue(now);
  //         const orientation = drone.orientation!.getValue(now);

  //         if (position && orientation) {
  //             // 计算机头方向
  //             const matrix = Cesium.Matrix3.fromQuaternion(orientation);
  //             const direction = Cesium.Matrix3.multiplyByVector(matrix, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());
  //             const ray = new Cesium.Ray(position, direction);

  //             // 射线探测
  //             const result = viewer!.scene.globe.pick(ray, viewer!.scene);
  //             if (result) {
  //                 const distance = Cesium.Cartesian3.distance(position, result);
  //                 (rayEntity.polyline as any).positions = [position, result];
                  
  //                 if (distance < 500) {
  //                     (rayEntity.polyline as any).material = Cesium.Color.RED;
  //                     currentDanger++;
  //                 } else {
  //                     (rayEntity.polyline as any).material = Cesium.Color.GREEN.withAlpha(0.5);
  //                 }
  //                 rayEntity.show = true;
  //             } else {
  //                 rayEntity.show = false;
  //             }
  //         }
  //     });

  //     // 更新 UI 统计（假设你页面有个 id 为 danger-info 的 div）
  //     if (dangerCount !== currentDanger) {
  //         dangerCount = currentDanger;
  //         console.log(`当前共有 ${dangerCount} 架无人机面临撞山风险！`);
  //     }
  // });

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(120.4795, 36.1012, 2000.0), // 经度, 纬度, 高度（米）
      orientation: {
          heading: Cesium.Math.toRadians(0.0), // 朝向：正北
          pitch: Cesium.Math.toRadians(-45.0), // 俯仰角：向下看 45 度
          roll: 0.0                            // 翻滚角
      }
  });

})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})


// function createQingdaoEntity() {
//   // 1. 设置模拟的开始与结束时间
//   const start = Cesium.JulianDate.fromDate(new Date());
//   const stop = Cesium.JulianDate.addSeconds(start, 60, new Cesium.JulianDate()); // 飞行60秒


//   // 3. 创建位置属性对象
//   const positionProperty = new Cesium.SampledPositionProperty();

//   // 点 1：起点（崂山某处）
//   const p1 = Cesium.Cartesian3.fromDegrees(120.4795, 36.1012, 300);
//   positionProperty.addSample(start, p1);

//   // 点 2：拐点（30秒后，向侧方偏一点）
//   const midTime = Cesium.JulianDate.addSeconds(start, 30, new Cesium.JulianDate());
//   const p2 = Cesium.Cartesian3.fromDegrees(120.4900, 36.1150, 300); // 坐标有偏移
//   positionProperty.addSample(midTime, p2);

//   // 点 3：终点（60秒后）
//   const stopTime = Cesium.JulianDate.addSeconds(start, 60, new Cesium.JulianDate());
//   const p3 = Cesium.Cartesian3.fromDegrees(120.5100, 36.1012, 300);
//   positionProperty.addSample(stopTime, p3);

//   positionProperty.setInterpolationOptions({
//       interpolationDegree: 2, //  degree越高越平滑，通常 2 或 5
//       interpolationAlgorithm: Cesium.HermitePolynomialApproximation // 使用埃尔米特多项式算法
//   });
  
//   // 2. 设置时钟，让时间轴动起来
//   viewer!.clock.startTime = start.clone();
//   viewer!.clock.stopTime = stop.clone();
//   viewer!.clock.currentTime = start.clone();
//   viewer!.clock.clockRange = Cesium.ClockRange.LOOP_STOP; // 循环播放
//   viewer!.clock.multiplier = 1; // 播放速率
//   viewer!.clock.shouldAnimate = true; 

//     // 2. 在青岛（中科星图低空云总部）打一个点
//   const qingdaoZhongkeEntity = viewer!.entities.add({
//     position: positionProperty,
//     orientation: new Cesium.VelocityOrientationProperty(positionProperty),
//     model: {
//       uri: '/public/Cesium_Air.glb'
//     },
//     // 绘制飞行路径线
//     path: {
//       resolution: 1,
//       material: new Cesium.PolylineGlowMaterialProperty({
//         glowPower: 1,
//         color: Cesium.Color.YELLOW
//       }),
//       width: 5
//     },
//     // point: {
//     //   pixelSize: 15,
//     //   color: Color.RED,
//     //   outlineColor: Color.WHITE,
//     //   outlineWidth: 2,
//     // },
//     // polygon : {
//     //   hierarchy : Cesium.Cartesian3.fromDegreesArray([
//     //                              120.450, 36.140,  // 左上
//     //       120.480, 36.140,  // 右上
//     //       120.480, 36.120,  // 右下
//     //       120.450, 36.120,  // 左下
//     //       120.450, 36.140   // 回到起点闭合
//     //       ]),
//     //   height : 0,
//     //   material : Cesium.Color.RED.withAlpha(0.5),
//     //   outline : true,
//     //   outlineColor : Cesium.Color.BLACK
//     // },
//     // label: {
//     //   text: '星图低空云-青岛总部',
//     //   font: '14pt monospace',
//     //   style: 'FILL_AND_OUTLINE',
//     //   verticalOrigin: -1, // 向上偏移
//     //   pixelOffset: { x: 0, y: -20 }
//     // }
//   });
  

//   // 1. 定义射线相关变量
//   const rayLength = 1000.0; // 探测距离：1000米
//   let intersectionPoint = new Cesium.Cartesian3(); // 记录交点

//   // 2. 创建一条可见的红/绿线来表示射线
//   const visualRay = viewer!.entities.add({
//       polyline: {
//           positions: new Cesium.CallbackProperty(() => {
//               // 获取飞机当前的实时位置和朝向
//               const now = viewer!.clock.currentTime;
//               const positionProperty = qingdaoZhongkeEntity.position;
//               const startPos = positionProperty ? positionProperty.getValue(now) : undefined;
//               if (!startPos) return [];

//               // 获取机头朝向向量
//               const orientationProperty = new Cesium.VelocityOrientationProperty(positionProperty);
//               const orientation = orientationProperty.getValue(now);
//               const matrix = Cesium.Matrix3.fromQuaternion(orientation);
//               const direction = Cesium.Matrix3.multiplyByVector(matrix, Cesium.Cartesian3.UNIT_X, new Cesium.Cartesian3());

//               // 构造射线
//               const ray = new Cesium.Ray(startPos, direction);
              
//               // 关键：探测射线与地形的交点
//               const scene = viewer!.scene;
//               const result = scene.globe.pick(ray, scene);

//               if (result) {
//                   intersectionPoint = result;
//                   const distance = Cesium.Cartesian3.distance(startPos, result);
                  
//                   // 如果距离小于500米，显示为红线，否则绿线
//                   (visualRay.polyline as any).material = distance < 500 ? Cesium.Color.RED : Cesium.Color.GREEN;
                  
//                   return [startPos, result];
//               } else {
//                   // 如果没撞到山，就画一根指定长度的虚线
//                   const endPos = Cesium.Ray.getPoint(ray, rayLength);
//                   (visualRay.polyline as any).material = Cesium.Color.GREEN.withAlpha(0.5);
//                   return [startPos, endPos];
//               }
//           }, false),
//           width: 3
//       }
//   });

//   // 3. 在碰撞点加一个预警光点（可选）
//   viewer!.entities.add({
//       position: new Cesium.CallbackPositionProperty(() => intersectionPoint, false),
//       point: {
//           pixelSize: 10,
//           color: Cesium.Color.YELLOW,
//           disableDepthTestDistance: Number.POSITIVE_INFINITY // 确保光点不被地形埋住
//       }
//   });

  
//   // viewer.trackedEntity = qingdaoZhongkeEntity;
//   return qingdaoZhongkeEntity;
// }
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}
</style>
