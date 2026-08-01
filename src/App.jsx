import { AuthProvider } from './context/AuthContext.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

// fe-crm hanya membutuhkan AuthProvider. Setiap halaman CRM mengelola datanya
// sendiri via crmApi + useServerList (tanpa context domain global).
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
