import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Home } from '@/pages/Home'
import { PostDetail } from '@/pages/PostDetail'
import { WritePost } from '@/pages/WritePost'
import { EditPost } from '@/pages/EditPost'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Profile } from '@/pages/Profile'
import { UserProfile } from '@/pages/UserProfile'
import { TagPosts } from '@/pages/TagPosts'
import { DesignSystem } from '@/pages/DesignSystem'
import { AnalogPlanner } from '@/pages/AnalogPlanner'

function BlogLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Outlet />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/my-blog">
        <Routes>
          <Route path="/planner" element={<AnalogPlanner />} />
          <Route element={<BlogLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route
              path="/write"
              element={
                <ProtectedRoute>
                  <WritePost />
                </ProtectedRoute>
              }
            />
            <Route path="/edit/:id" element={<EditPost />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/tag/:tagName" element={<TagPosts />} />
            <Route path="/design-system" element={<DesignSystem />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
