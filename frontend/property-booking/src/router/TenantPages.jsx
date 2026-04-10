import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SpatialHomePage      from '../pages/smar/spatial/SpatialHomePage';
import SpatialPropertyDetails from '../pages/smar/spatial/SpatialPropertyDetails';
import NormalHomePage       from '../pages/smar/normal/NormalHomePage';

const TenantPages = () => {
    return (
        <Routes>
            {/* Smar Spatial Routes (Cinematic Experience) */}
            <Route path="/smar/spatial"              element={<SpatialHomePage />} />
            <Route path="/smar/spatial/property/:id" element={<SpatialPropertyDetails />} />

            {/* Smar Normal Routes (2D Booking Flow) */}
            <Route path="/smar/normal"               element={<NormalHomePage />} />

            {/* Default → Spatial (Prime Directive) */}
            <Route path="/" element={<Navigate to="/smar/spatial" replace />} />
        </Routes>
    );
};

export default TenantPages;
