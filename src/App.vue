<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import ToastContainer from './components/ToastContainer.vue'

const route = useRoute()

// Admin + Staff đều KHÔNG dùng client header/footer
const isPanelRoute = computed(() =>
  route.path.startsWith('/admin') || route.path.startsWith('/staff')
)
</script>

<template>
  <ToastContainer />

  <!-- ADMIN + STAFF: chỉ RouterView (đã có layout riêng) -->
  <RouterView v-if="isPanelRoute" />

  <!-- CLIENT: có header + footer -->
  <div v-else class="app-shell">
    <AppHeader />
    <main class="site-main">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}
.site-main {
  flex: 1;
  width: 100%;
}
</style>