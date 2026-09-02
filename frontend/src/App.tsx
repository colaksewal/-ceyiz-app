import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ListsPage from "./pages/ListsPage";
import ListDetailPage from "./pages/ListDetailPage";
import ProductPage from "./pages/ProductPage";
import SetsPage from "./pages/SetsPage";
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
            <Route path="/lists/:listId" element={<ListDetailPage />} />
            <Route path="/lists/:listId/sets" element={<SetsPage />} />
            <Route path="/products/:productId" element={<ProductPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
