// 引入路由函数组件
import { createBrowserRouter, Navigate, RouterProvider} from 'react-router-dom'

// 引入路由组件
//import AuthProvider from '@/auth/AuthContext.jsx'
import HomeAdmin from '@/pages/admin/AdminHome.jsx'
import AdminHotelList from '@/pages/admin/AdminHotelList.jsx'
import HomeMerchant from '@/pages/merchant/MerchantHome.jsx'
import MerchantHotelList from '@/pages/merchant/MerchantHotelList.jsx'
import MerchantHotelAdd from '@/pages/merchant/MerchantHotelAdd.jsx'
import Login from '@/pages/login/login.jsx'
import Register from '@/pages/register/register.jsx'
import HotelDetailView from "@/pages/merchant/HotelDetailView.jsx"
import HotelDetailEdit from "@/pages/merchant/HotelDetailEdit.jsx"
import CalendarEdit from "@/pages/merchant/CalendarEdit.jsx"



//引入框架组件
import Layout from '@/layout/layout.jsx'

//路由配置项
const routes = [
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },
    {
        path: '/',
        element: <Layout />,
        children: [
            {
                path: "/home-admin",
                element: <HomeAdmin />,
            },
            {
                path: "/admin-hotelList",
                element: <AdminHotelList />,
            },
            {
                path: "/home-merchant",
                element: <HomeMerchant />,
            },
            {
                path: "/merchant-hotelList",
                element: <MerchantHotelList />,
            },
            {
                path: "/hotelAdd",
                element: <MerchantHotelAdd />,
            },
        ]
    },
    {
        path: "/hotel-detail/:hotelId",
        element: <HotelDetailView />,
    },
    {
        path: "/hotel-detail/:hotelId/edit",
        element: <HotelDetailEdit />,
    },
    {
        path: "/calendar-edit/:roomId",
        element: <CalendarEdit />,
    },
]

//创建路由实例对象
const router = createBrowserRouter(routes)

//创建路由组件
export default function Router(){
    return <RouterProvider router={router} />
}