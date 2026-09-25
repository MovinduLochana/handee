import { useState, useEffect } from "react";
import type { PaymentMethodItem } from "../api/payments";

export const PAYMENT_METHODS_EVENT = "handee_payment_methods_updated";

/**
 * Returns consistent sandbox default cards used across checkout and saved cards.
 */
export function getDefaultPaymentMethods(
  holderName: string = "TEST CUSTOMER",
): PaymentMethodItem[] {
  return [
    {
      id: "pm_stripe_visa",
      type: "card",
      brand: "Visa",
      name: "Stripe Sandbox Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2028,
      isDefault: true,
      holderName: holderName,
      token: "tok_visa_sandbox",
    },
    {
      id: "pm_mastercard",
      type: "card",
      brand: "Mastercard",
      name: "Mastercard Test",
      last4: "5555",
      expiryMonth: 8,
      expiryYear: 2029,
      isDefault: false,
      holderName: holderName,
      token: "tok_mc_sandbox",
    },
    {
      id: "pm_payhere",
      type: "card",
      brand: "PayHere",
      name: "PayHere Demo Wallet",
      last4: "7777",
      expiryMonth: 11,
      expiryYear: 2030,
      isDefault: false,
      holderName: holderName,
      token: "tok_payhere_sandbox",
    },
  ];
}

function getStorageKey(userId?: string): string {
  return `handee_saved_payment_methods_${userId || "default"}`;
}

/**
 * Loads saved cards for the given user from localStorage.
 * Seeds initial sandbox cards if the user doesn't have any yet.
 */
export function getSavedPaymentMethods(
  userId?: string,
  defaultHolderName?: string,
): PaymentMethodItem[] {
  const key = getStorageKey(userId);
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to read payment methods from localStorage", err);
  }

  // Seed default methods for this user
  const defaults = getDefaultPaymentMethods(defaultHolderName);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(defaults));
    }
  } catch {
    // ignore in restricted environments
  }
  return defaults;
}

/**
 * Saves a new payment card to the user's vault in localStorage and dispatches a sync event.
 */
export function savePaymentMethod(
  method: Omit<PaymentMethodItem, "id"> & { id?: string },
  userId?: string,
  defaultHolderName?: string,
): PaymentMethodItem[] {
  const current = getSavedPaymentMethods(userId, defaultHolderName);
  const brand = method.brand || "Visa";
  const id = method.id || `pm_${Date.now()}`;
  const token =
    method.token || `tok_${brand.toLowerCase().replace(/[^a-z0-9]/g, "")}_sandbox_${method.last4}`;

  const isFirst = current.length === 0;
  const isDefault = method.isDefault ?? isFirst;

  const newItem: PaymentMethodItem = {
    id,
    type: method.type || "card",
    brand,
    name: method.name || `${brand} •••• ${method.last4}`,
    last4: method.last4,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isDefault,
    holderName: method.holderName || defaultHolderName || "TEST CUSTOMER",
    token,
  };

  let updated: PaymentMethodItem[];
  if (isDefault) {
    updated = [...current.map((m) => ({ ...m, isDefault: false })), newItem];
  } else {
    updated = [...current, newItem];
  }

  const key = getStorageKey(userId);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(PAYMENT_METHODS_EVENT, { detail: { userId } }));
    }
  } catch {
    // ignore
  }
  return updated;
}

/**
 * Sets a specific card as the default across both saved cards and checkout.
 */
export function setDefaultPaymentMethod(
  id: string,
  userId?: string,
  defaultHolderName?: string,
): PaymentMethodItem[] {
  const current = getSavedPaymentMethods(userId, defaultHolderName);
  const updated = current.map((m) => ({
    ...m,
    isDefault: m.id === id,
  }));

  const key = getStorageKey(userId);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(PAYMENT_METHODS_EVENT, { detail: { userId } }));
    }
  } catch {
    // ignore
  }
  return updated;
}

/**
 * Deletes a card from the vault and updates default selection if needed.
 */
export function deletePaymentMethod(
  id: string,
  userId?: string,
  defaultHolderName?: string,
): PaymentMethodItem[] {
  const current = getSavedPaymentMethods(userId, defaultHolderName);
  let updated = current.filter((m) => m.id !== id);

  if (updated.length > 0 && !updated.some((m) => m.isDefault)) {
    updated[0] = { ...updated[0], isDefault: true };
  }

  const key = getStorageKey(userId);
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(PAYMENT_METHODS_EVENT, { detail: { userId } }));
    }
  } catch {
    // ignore
  }
  return updated;
}

/**
 * React hook that provides live, synchronized access to saved payment methods.
 * Responds instantly to changes made across tabs or between Checkout and Saved Cards pages.
 */
export function usePaymentMethods(userId?: string, defaultHolderName?: string) {
  const [methods, setMethods] = useState<PaymentMethodItem[]>(() =>
    getSavedPaymentMethods(userId, defaultHolderName),
  );

  useEffect(() => {
    setMethods(getSavedPaymentMethods(userId, defaultHolderName));
  }, [userId, defaultHolderName]);

  useEffect(() => {
    const handleUpdate = () => {
      setMethods(getSavedPaymentMethods(userId, defaultHolderName));
    };

    if (typeof window !== "undefined") {
      window.addEventListener(PAYMENT_METHODS_EVENT, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(PAYMENT_METHODS_EVENT, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, [userId, defaultHolderName]);

  const addCard = (card: Omit<PaymentMethodItem, "id">) => {
    return savePaymentMethod(card, userId, defaultHolderName);
  };

  const removeCard = (id: string) => {
    return deletePaymentMethod(id, userId, defaultHolderName);
  };

  const setCardDefault = (id: string) => {
    return setDefaultPaymentMethod(id, userId, defaultHolderName);
  };

  const defaultCard = methods.find((m) => m.isDefault) || methods[0];

  return {
    methods,
    defaultCard,
    addCard,
    removeCard,
    setCardDefault,
  };
}
