import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { offers, type AppliedPromo, type AvailablePromo } from '@/lib/checkout';
import { friendlyError } from '@/lib/consult/api';

export interface Offers {
    code: string;
    setCode: (code: string) => void;
    applied: AppliedPromo | null;
    available: AvailablePromo[];
    loadingAvailable: boolean;
    showList: boolean;
    setShowList: (show: boolean) => void;
    checking: boolean;
    error: string;
    apply: (override?: string) => Promise<void>;
    remove: () => void;
    walletBalance: number;
    useWallet: boolean;
    setUseWallet: (use: boolean) => void;
}

/** Promo code and wallet, the way the website's usePromo holds them. The server sets the discount. */
export function useOffers(cartTotal: number): Offers {
    const wallet = useQuery({ queryKey: ['checkout', 'wallet'], queryFn: offers.wallet, staleTime: 60_000 });
    const promos = useQuery({ queryKey: ['checkout', 'promos'], queryFn: offers.available, staleTime: 60_000 });

    const [code, setCode] = useState('');
    const [applied, setApplied] = useState<AppliedPromo | null>(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const [useWallet, setUseWallet] = useState(false);
    const [showList, setShowList] = useState(false);

    const apply = useCallback(
        async (override?: string) => {
            const wanted = (override ?? code).trim().toUpperCase();
            if (!wanted) return;
            setChecking(true);
            setError('');
            try {
                const promo = await offers.validate(wanted, cartTotal);
                setApplied(promo);
                setCode(wanted);
                setShowList(false);
            } catch (e) {
                setApplied(null);
                setError(friendlyError(e, 'That promo code could not be used.'));
            } finally {
                setChecking(false);
            }
        },
        [code, cartTotal],
    );

    const remove = useCallback(() => {
        setApplied(null);
        setCode('');
        setError('');
        setShowList(false);
    }, []);

    return {
        code,
        setCode,
        applied,
        available: promos.data ?? [],
        loadingAvailable: promos.isLoading,
        showList,
        setShowList,
        checking,
        error,
        apply,
        remove,
        walletBalance: wallet.data ?? 0,
        useWallet,
        setUseWallet,
    };
}
