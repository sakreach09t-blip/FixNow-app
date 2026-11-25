import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import About from "./pages/About.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Booking from "./pages/Booking.jsx";
import Contact from "./pages/Contact.jsx";
import Home from "./pages/Home.jsx";
import Join from "./pages/Join.jsx";
import { Privacy, Terms } from "./pages/Legal.jsx";
import Login from "./pages/Login.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import NotFound from "./pages/NotFound.jsx";
import Services from "./pages/Services.jsx";
import Technicians from "./pages/Technicians.jsx";

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="technicians" element={<Technicians />} />
                <Route path="services" element={<Services />} />
                <Route path="about" element={<About />} />
                <Route path="join" element={<Join />} />
                <Route path="login" element={<Login />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="booking" element={<Booking />} />
                <Route path="my-bookings" element={<MyBookings />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}
