import sqlite3,datetime,pathlib
root=pathlib.Path('/var/backups/bar-advisor')
p=root/('bar-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')+'.sqlite')
with sqlite3.connect('file:/var/lib/bar-advisor/bar.sqlite?mode=ro',uri=True) as source,sqlite3.connect(p) as dest:
 source.backup(dest)
p.chmod(0o600)
for old in sorted(root.glob('bar-*.sqlite'))[:-7]:old.unlink()
