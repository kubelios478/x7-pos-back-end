import { Like, Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';

/**
 * Username libre para un alta que no eligió uno: la parte local del email, o con -2, -3…
 * si ya existe. Antes el onboarding público respondía 409 ("Username is already taken")
 * al segundo admin@ de cualquier compañía, y el wizard creaba el duplicado sin avisar.
 * El username no se usa para entrar ni para buscar usuarios (el login va por email).
 */
export async function availableUsername(
  userRepository: Repository<User>,
  email: string,
): Promise<string> {
  const base = email.split('@')[0];
  // Una consulta: el base y sus variantes con sufijo (un _ del email también actúa de
  // comodín en LIKE; sólo agrega candidatos que después no coinciden).
  const taken = new Set(
    (
      await userRepository.find({
        select: { username: true },
        where: [{ username: base }, { username: Like(`${base}-%`) }],
      })
    ).map((user) => user.username),
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}
