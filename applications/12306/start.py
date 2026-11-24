#!/usr/bin/env python3
"""12306 launcher. Standard library only; never installs dependencies."""
import sys

if sys.version_info < (3, 8):
    print('12306 requires Python 3.8 or newer. Install it, then retry.', file=sys.stderr)
    sys.exit(1)

import argparse
import importlib
import os
from pathlib import Path
import shlex
import signal
import socket
import subprocess
import json
import tempfile
import time
import secrets

_port_lock = None


def process_alive(pid):
    if not isinstance(pid, int) or pid <= 0:
        return False
    if os.name == 'nt':
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        handle = kernel.OpenProcess(0x100000, False, pid)
        if not handle:
            return ctypes.get_last_error() == 5  # Access denied: treat as live.
        try:
            return kernel.WaitForSingleObject(handle, 0) == 258
        finally:
            kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def acquire_port_lock(port):
    global _port_lock
    directory = Path(tempfile.gettempdir()) / 'course-web-startup-ports' / str(port)
    directory.parent.mkdir(exist_ok=True)
    token = secrets.token_hex(16)
    for attempt in range(2):
        try:
            directory.mkdir()
        except FileExistsError:
            try:
                owner = json.loads((directory / 'owner.json').read_text())
            except (OSError, ValueError):
                # A different launcher may still be creating its owner record.
                try:
                    if time.time() - directory.stat().st_mtime > 30:
                        (directory / 'owner.json').unlink(missing_ok=True)
                        directory.rmdir()
                        continue
                except OSError:
                    pass
                return False
            if process_alive(owner.get('pid')):
                return False
            try:
                (directory / 'owner.json').unlink()
                directory.rmdir()
            except OSError:
                return False
            continue
        _port_lock = (directory, token)
        (directory / 'owner.json').write_text(json.dumps({'pid': os.getpid(), 'token': token}))
        return True
    return False


def release_port_lock():
    global _port_lock
    if _port_lock is None:
        return
    directory, token = _port_lock
    _port_lock = None
    try:
        if json.loads((directory / 'owner.json').read_text()).get('token') == token:
            (directory / 'owner.json').unlink()
            directory.rmdir()
    except (OSError, ValueError):
        pass


def manual_commands(root, host, port):
    print('\nAutomatic startup did not complete normally. After resolving the error, run manually:', file=sys.stderr)
    if os.name == 'nt':
        quote = lambda value: "'" + str(value).replace("'", "''") + "'"
        print('Windows PowerShell:', file=sys.stderr)
        print('  Set-Location -LiteralPath ' + quote(root), file=sys.stderr)
        print('  $env:HOST = ' + quote(host), file=sys.stderr)
        print('  $env:PORT = ' + quote(port), file=sys.stderr)
        print('  & ' + quote(sys.executable) + ' backend/server.py', file=sys.stderr)
    else:
        print('macOS Terminal / Linux shell:', file=sys.stderr)
        print('  cd -- ' + shlex.quote(str(root)), file=sys.stderr)
        print('  HOST={} PORT={} {} backend/server.py'.format(
            shlex.quote(host), shlex.quote(str(port)), shlex.quote(sys.executable)), file=sys.stderr)


def main():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description='Start 12306 without installing dependencies.')
    parser.add_argument('--host', default=os.environ.get('HOST', '127.0.0.1'))
    parser.add_argument('--port', default=os.environ.get('PORT', 'auto'), help='auto or a fixed port')
    parser.add_argument('--port-range', default=os.environ.get('PORT_RANGE', '3000-3999'), help='automatic search range, inclusive')
    parser.add_argument('--check-deps', action='store_true', help='check dependencies without starting')
    try:
        args = parser.parse_args()
    except SystemExit as error:
        if error.code:
            manual_commands(root, os.environ.get('HOST', '127.0.0.1'), '3000')
        return error.code
    child = None
    terminated = False
    old_term = None
    port = None
    try:
        try:
            start, end = [int(value) for value in args.port_range.split('-')]
        except ValueError:
            raise RuntimeError('PORT_RANGE must have the form 3000-3999.')
        if not 1 <= start <= end <= 65535:
            raise RuntimeError('PORT_RANGE must be ascending and within 1-65535.')
        automatic = str(args.port).lower() == 'auto'
        if not automatic:
            try:
                port = int(args.port)
            except ValueError:
                raise RuntimeError('PORT must be auto or an integer between 1 and 65535.')
            if not 1 <= port <= 65535:
                raise RuntimeError('PORT must be between 1 and 65535.')
        if not args.host.strip():
            raise RuntimeError('HOST must not be empty.')
        for module in ('re', 'json', 'html', 'sqlite3', 'http.server', 'hashlib', 'secrets', 'urllib.parse'):
            try:
                importlib.import_module(module)
            except ImportError as error:
                raise RuntimeError('Missing Python standard-library component {}. Install a complete Python distribution. {}'.format(module, error))
        import hashlib
        if not callable(getattr(hashlib, 'pbkdf2_hmac', None)):
            raise RuntimeError('Python hashlib.pbkdf2_hmac is unavailable. Install a complete Python distribution.')
        if not (root / 'backend/server.py').is_file():
            raise RuntimeError('backend/server.py is missing. Restore the complete 12306 application folder.')
        if args.check_deps:
            print('Dependencies OK: 12306; no dependencies were installed.')
            return 0

        def on_term(signum, frame):
            nonlocal terminated
            terminated = True
            if child is not None and child.poll() is None:
                child.terminate()

        old_term = signal.signal(signal.SIGTERM, on_term)
        display_host = 'localhost' if args.host in ('0.0.0.0', '::') else args.host
        if ':' in display_host:
            display_host = '[' + display_host + ']'
        print('Dependencies OK: Python {} with SQLite; no npm or pip packages required.'.format(sys.version.split()[0]), flush=True)
        candidates = range(start, end + 1) if automatic else [port]
        for candidate in candidates:
            if not acquire_port_lock(candidate):
                if not automatic:
                    raise RuntimeError('Requested port {} is reserved by another launcher.'.format(candidate))
                continue
            if not port_available(args.host, candidate):
                release_port_lock()
                if not automatic:
                    raise RuntimeError('Requested port {} is unavailable. Stop its owner or use --port auto.'.format(candidate))
                continue
            port = candidate
            env = os.environ.copy()
            env.update(HOST=args.host, PORT=str(port), PYTHONUNBUFFERED='1')
            print('Starting 12306 at http://{}:{} (Ctrl+C to stop).'.format(display_host, port), flush=True)
            child = subprocess.Popen([sys.executable, '-u', str(root / 'backend/server.py')], cwd=str(root), env=env)
            if terminated:
                child.terminate()
            code = child.wait()
            if terminated:
                raise RuntimeError('12306 was interrupted.')
            if code != 0:
                # Another process can claim the port between checking and binding.
                if automatic and not port_available(args.host, port):
                    release_port_lock()
                    print('Port {} was taken during startup; trying the next port.'.format(port), flush=True)
                    continue
                raise RuntimeError('12306 exited with status {}. See the error above.'.format(code))
            return 0
        raise RuntimeError('No available port in range {}. Use --port-range START-END.'.format(args.port_range))
    except KeyboardInterrupt:
        print('\n12306 stopped by user.', flush=True)
        return 0
    except (OSError, RuntimeError) as error:
        print('Error: {}'.format(error), file=sys.stderr)
        manual_commands(root, args.host, port if port and 1 <= port <= 65535 else '3000')
        return 1
    finally:
        if child is not None and child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()
        if old_term is not None:
            signal.signal(signal.SIGTERM, old_term)
        release_port_lock()


def port_available(host, port):
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError as error:
        raise RuntimeError('Cannot resolve HOST: {}'.format(error))
    for family, socktype, protocol, _, address in addresses:
        with socket.socket(family, socktype, protocol) as probe:
            if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            try:
                probe.bind(address)
            except OSError:
                return False
    return True


if __name__ == '__main__':
    sys.exit(main())
