Use this exact order so you don’t lock yourself out before cleanup.

1) While still connected to the droplet (remote shell)

Remove your org-laptop key from the server:
cp ~/.ssh/authorized_keys ~/.ssh/authorized_keys.bak
grep -vF 'saad@macbook' ~/.ssh/authorized_keys.bak > ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
Exit remote session: exit
2) On your Mac terminal (local machine)

Remove key from SSH agent (if loaded): ssh-add -d ~/.ssh/id_ed25519 || true
Delete local key files: rm -f ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub
Remove saved host fingerprint: ssh-keygen -R 139.59.95.13
3) Verify local wipe (Mac)

ls -l ~/.ssh/id_ed25519* (should show “No such file”)
ssh-add -l (should not list that key)
