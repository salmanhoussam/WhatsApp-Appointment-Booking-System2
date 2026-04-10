import { useState } from 'react';
import { publicApi } from '../../data/api';

export const useBooking = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const submitBooking = async (unitId, clientSlug, bookingData) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            const response = await publicApi.post('/bookings/', {
                unit_id: unitId,
                client_slug: clientSlug,
                ...bookingData
            });

            setSuccess(true);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { submitBooking, loading, error, success };
};
