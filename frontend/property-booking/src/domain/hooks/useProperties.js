import { useState, useEffect } from 'react';
import { publicApi } from '../../data/api';

export const useProperties = (clientSlug = 'smar') => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setLoading(true);
                const response = await publicApi.get('/properties/', {
                    params: { client_slug: clientSlug }
                });
                setProperties(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [clientSlug]);

    return { properties, loading, error };
};
