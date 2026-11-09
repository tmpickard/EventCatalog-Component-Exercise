export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

export type NewUser = Pick<UserRecord, 'email' | 'displayName'> & {
  password: string;
};

export function toPublicUser(user: UserRecord): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
