import { Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { availableUsername } from './available-username.util';

describe('availableUsername', () => {
  const repoWith = (usernames: string[]) => {
    const find = jest
      .fn()
      .mockResolvedValue(usernames.map((username) => ({ username })));
    return { repo: { find } as unknown as Repository<User>, find };
  };

  it('uses the local part of the email when it is free', async () => {
    const { repo, find } = repoWith([]);
    await expect(availableUsername(repo, 'admin@acme.com')).resolves.toBe(
      'admin',
    );
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('adds -2 when the local part is taken', async () => {
    const { repo } = repoWith(['admin']);
    await expect(availableUsername(repo, 'admin@acme.com')).resolves.toBe(
      'admin-2',
    );
  });

  it('takes the first free suffix', async () => {
    const { repo } = repoWith(['admin', 'admin-2', 'admin-3', 'admin-5']);
    await expect(availableUsername(repo, 'admin@acme.com')).resolves.toBe(
      'admin-4',
    );
  });

  it('ignores lookalikes that LIKE also returns', async () => {
    // "a_b" en LIKE también coincide con "axb": no cuenta como ocupado.
    const { repo } = repoWith(['axb', 'a_b-2']);
    await expect(availableUsername(repo, 'a_b@acme.com')).resolves.toBe('a_b');
  });
});
