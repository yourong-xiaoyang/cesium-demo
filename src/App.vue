<template>
  <div id="app-container">
    <div class="cesium-item">
      <CesiumMap />
    </div>
  </div>
</template>

<script setup lang="ts">
import CesiumMap from './components/CesiumMap.vue'
</script>

<style scoped>
#app-container {
  width: 100%;
  height: 100%;
}
</style>
