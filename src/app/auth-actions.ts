'use server';

import { signIn, signOut } from '@/auth';

/**
 * Sign-in/out as standalone actions so client components (the user menu)
 * can use them without each caller redeclaring an inline server action.
 */
export async function signOutAction() {
  await signOut();
}

export async function signInAction() {
  await signIn('keycloak');
}
