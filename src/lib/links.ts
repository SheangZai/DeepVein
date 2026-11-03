/** Public web build: shared links open here so friends can play without installing. */
export const WEB_URL = 'https://deepvein.app';

export const roomUrl = (code: string) => `${WEB_URL}/party/${code}`;

/** Opening this asks the reader to add the sender as a friend. */
export const inviteUrl = (friendCode: string) => `${WEB_URL}/?friend=${encodeURIComponent(friendCode)}`;
