import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../navbar/ModernNavbar';
import Sidebar from '../sidebar/Sidebar';
import './MainLayout.css'; // 🌟 Yeh line zaroor add karein!


const MainLayout = () => {

    const currentRole = localStorage.getItem("role")?.toLowerCase();
    const location = useLocation();

    // 🌟 MAGIC FIX: Agar user student hai aur wo exact '/dashboard' ya '/dashboard/' par hai, 
    // Student ko seedha student list par bhejo.
    if (currentRole === 'student' && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
        return <Navigate to="/dashboard/studentlist" replace />;
    }

    return (
        // Wrapper jisme navbar aur baaki body rahegi
        <div className="app-container">
            <Navbar />

            {/* Sidebar aur Content ko side-by-side rakhne wala container */}
            <div className="app-body">
                <Sidebar />

                {/* Main area jisme dynamic pages load hote hain */}
                <main className="main-content">
                    {/* Yahan par pages automatically bina overlap ke render honge */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
