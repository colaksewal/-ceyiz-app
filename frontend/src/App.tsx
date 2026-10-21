import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ListsPage from "./pages/ListsPage";
import ListDetailPage from "./pages/ListDetailPage";
import ProductPage from "./pages/ProductPage";
import SetsPage from "./pages/SetsPage";
import ListSharesPage from "./pages/ListSharesPage";
import AdminTemplatesPage from "./pages/AdminTemplatesPage";
import SetTemplatesPage from "./pages/SetTemplatesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/ceyiz-ekibim" element={<ListsPage key="team" mode="team" />} />
            <Route path="/lists/:listId" element={<ListDetailPage />} />
            <Route path="/lists/:listId/sets" element={<SetsPage />} />
            <Route path="/lists/:listId/ceyiz-ekibi" element={<ListSharesPage />} />
            <Route path="/products/:productId" element={<ProductPage />} />
            <Route path="/admin/templates" element={<AdminTemplatesPage />} />
            <Route path="/setler" element={<SetTemplatesPage />} />
            <Route path="/admin/set-templates" element={<Navigate to="/setler" replace />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
