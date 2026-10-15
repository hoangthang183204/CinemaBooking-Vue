import { createRouter, createWebHistory } from 'vue-router'
import { homeForRole } from '../auth'
import Home from '../views/Home.vue'
import MovieShowtimes from '../views/MovieShowtimes.vue'
import SeatSelection from '../views/SeatSelection.vue'
import Payment from '../views/Payment.vue'
import BookingSuccess from '../views/BookingSuccess.vue'
import MyTickets from '../views/MyTickets.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'

// ========== ADMIN ==========
import AdminLayout from '../layouts/AdminLayout.vue'
import AdminDashboard from '../views/admin/Dashboard.vue'

// ========== STAFF ==========
import StaffLayout from '../layouts/StaffLayout.vue'
import StaffDashboard from '../views/staff/Dashboard.vue'

const routes = [
  // ========== USER ==========
  { path: '/', name: 'Home', component: Home },
  { path: '/movie/:id', name: 'MovieShowtimes', component: MovieShowtimes, props: true },
  {
    path: '/book',
    name: 'BookSeats',
    component: SeatSelection,
    meta: { requiresAuth: true },
  },
  {
    path: '/payment/:bookingId',
    name: 'Payment',
    component: Payment,
    props: true,
    meta: { requiresAuth: true },
  },
  { path: '/booking-success', name: 'BookingSuccess', component: BookingSuccess },
  {
    path: '/my-tickets',
    name: 'MyTickets',
    component: MyTickets,
    meta: { requiresAuth: true },
  },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  { path: '/lich-chieu', name: 'Showtimes', component: () => import('../views/Showtimes.vue') },
  { path: '/tin-tuc', name: 'News', component: () => import('../views/News.vue') },
  { path: '/khuyen-mai', name: 'Promotions', component: () => import('../views/Promotions.vue') },
  { path: '/gia-ve', name: 'TicketPrices', component: () => import('../views/TicketPrices.vue') },
  { path: '/lien-hoan-phim', name: 'Festivals', component: () => import('../views/Festivals.vue') },
  { path: '/gioi-thieu', name: 'About', component: () => import('../views/About.vue') },

  // ========== ADMIN ==========
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: AdminDashboard,
      },
      {
        path: 'movies',
        name: 'AdminMovies',
        component: () => import('../views/admin/MoviesAdmin.vue'),
      },
      {
        path: 'rooms',
        name: 'AdminRooms',
        component: () => import('../views/admin/RoomsAdmin.vue'),
      },
      {
        path: 'showtimes',
        name: 'AdminShowTimes',
        component: () => import('../views/admin/ShowTimesAdmin.vue'),
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/UsersAdmin.vue'),
      },
      {
        path: 'bookings',
        name: 'AdminBookings',
        component: () => import('../views/admin/BookingsAdmin.vue'),
      },
      {
        path: 'home',
        name: 'AdminHomeContent',
        component: () => import('../views/admin/HomeContentAdmin.vue'),
      },
      {
        path: 'concessions',
        name: 'AdminConcessions',
        component: () => import('../views/admin/ConcessionsAdmin.vue'),
      },
      {
        path: 'pages',
        name: 'AdminSitePages',
        component: () => import('../views/admin/SitePagesAdmin.vue'),
      },
    ],
  },

  // ========== STAFF ==========
  {
    path: '/staff',
    component: StaffLayout,
    meta: { requiresAuth: true, requiresStaff: true },
    children: [
      {
        path: '',
        name: 'StaffDashboard',
        component: StaffDashboard,
      },
      {
        path: 'pos',
        name: 'StaffPOS',
        component: () => import('../views/staff/POS.vue'),
      },
      {
        path: 'concessions',
        name: 'StaffConcessions',
        component: () => import('../views/staff/Concessions.vue'),
      },
      {
        path: 'checkin',
        name: 'StaffCheckIn',
        component: () => import('../views/staff/CheckIn.vue'),
      },
      {
        path: 'bookings',
        name: 'StaffBookings',
        component: () => import('../views/staff/Bookings.vue'),
      },
      {
        path: 'qr',
        name: 'StaffQR',
        component: () => import('../views/staff/QRGenerator.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('cb_token')
  const user = JSON.parse(localStorage.getItem('cb_user') || 'null')

  console.log('[guard]', to.path, '| token:', !!token, '| role:', user?.role)

  // Đã login mà vào /login hoặc /register → về trang theo vai trò
  if ((to.path === '/login' || to.path === '/register') && token) {
    return next(homeForRole(user?.role))
  }

  // Route cần login mà chưa login → về /login
  if (to.meta.requiresAuth && !token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Route cần admin → chỉ Admin
  if (to.meta.requiresAdmin) {
    if (!user || user.role !== 'Admin') {
      console.warn('Không có quyền Admin → về trang của vai trò')
      return next(homeForRole(user?.role))
    }
  }

  // Route cần staff → Staff hoặc Admin
  if (to.meta.requiresStaff) {
    if (!user || (user.role !== 'Staff' && user.role !== 'Admin')) {
      console.warn('Không có quyền Staff → về trang chủ')
      return next('/')
    }
  }

  next()
})

export default router