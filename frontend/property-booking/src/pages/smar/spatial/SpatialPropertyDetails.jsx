import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { useBooking } from '../../../domain/hooks/useBooking';
import { Calendar, Users, MapPin } from 'lucide-react';

const Model = ({ url }) => {
    const { scene } = useGLTF(url || '/fallback-model.glb');
    return <primitive object={scene} />;
};

const SpatialPropertyDetails = () => {
    const { id } = useParams();
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests] = useState(1);
    const { submitBooking, loading, error, success } = useBooking();

    const handleBook = async () => {
        try {
            await submitBooking(id, 'smar', {
                checkIn,
                checkOut,
                guests,
                totalPrice: 1500, // Dynamic calc would go here
                customerName: "Guest User", // Resolved from auth later
                customerPhone: "00000000"
            });
        } catch (e) {
            console.error("Booking error:", e);
        }
    };

    return (
        <div className="spatial-details" data-slug="smar" style={{ height: '100vh', position: 'relative', overflow: 'hidden' }}>
            {/* 3D Environment Layer */}
            <div className="canvas-wrapper" style={{ position: 'absolute', inset: 0 }}>
                <Canvas shadows camera={{ position: [5, 5, 5], fov: 45 }}>
                    <Stage environment="forest" intensity={0.5}>
                        <Model url={`https://gdzthjcvzvhfpsvoxhbm.supabase.co/storage/v1/object/public/stores/smar/properties/${id}/model.glb`} />
                    </Stage>
                    <OrbitControls makeDefault autoRotate />
                </Canvas>
            </div>

            {/* Glassmorphism Booking Overlay */}
            <motion.div 
                className="glass-panel booking-panel"
                initial={{ x: 500, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
                style={{ 
                    position: 'absolute', right: 40, top: '10%', width: 400, 
                    padding: 30, color: 'white', zIndex: 10 
                }}
            >
                <h1 style={{ marginBottom: 10 }}>Mountain Chalet</h1>
                <p style={{ opacity: 0.7, marginBottom: 20 }}>Experience extreme luxury in the heart of the wild.</p>
                
                <div className="booking-form">
                    <div className="input-group">
                        <label><Calendar size={14} /> Check In</label>
                        <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                    </div>
                    
                    <div className="input-group" style={{ marginTop: 15 }}>
                        <label><Calendar size={14} /> Check Out</label>
                        <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                    </div>

                    <div className="input-group" style={{ marginTop: 15 }}>
                        <label><Users size={14} /> Guests</label>
                        <input type="number" value={guests} onChange={e => setGuests(e.target.value)} min={1} />
                    </div>

                    <button 
                        className="book-cta"
                        onClick={handleBook}
                        disabled={loading}
                        style={{ 
                            width: '100%', padding: '15px 0', marginTop: 30, background: '#8b9d83', 
                            border: 'none', borderRadius: 10, color: 'white', fontWeight: 'bold', 
                            cursor: 'pointer', fontSize: '1.2rem'
                        }}
                    >
                        {loading ? 'Processing...' : 'BOOK NOW'}
                    </button>

                    <AnimatePresence>
                        {success && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#4caf50', marginTop: 10 }}>
                                Booking successful! See you soon.
                            </motion.p>
                        )}
                        {error && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#f44336', marginTop: 10 }}>
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default SpatialPropertyDetails;
