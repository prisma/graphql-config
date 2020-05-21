import path from 'path';
import del from 'del';
import makeDir from 'make-dir';
import parentModule from 'parent-module';
import os from 'os';

const fs = jest.requireActual('fs');

function normalizeDirectorySlash(pathname: string): string {
  const normalizeCrossPlatform = pathname.replace(/\\/g, '/');

  return normalizeCrossPlatform;
}

export class TempDir {
  public dir: string;

  public constructor() {
    /**
     * Get the actual path for temp directories that are symlinks (MacOS).
     * Without the actual path, tests that use process.chdir will unexpectedly
     * return the real path instead of symlink path.
     */
    const tempDir = fs.realpathSync(os.tmpdir());
    /**
     * Get the pathname of the file that imported util.js.
     * Used to create a unique directory name for each test suite.
     */
    const parent = parentModule() || 'cosmiconfig';
    const relativeParent = path.relative(process.cwd(), parent);

    /**
     * Each temp directory will be unique to the test file.
     * This ensures that temp files/dirs won't cause side effects for other tests.
     */
    this.dir = path.resolve(tempDir, 'cosmiconfig', `${relativeParent}-dir`);

    // create directory
    makeDir.sync(this.dir);
  }

  public absolutePath(dir: string): string {
    // Use path.join to ensure dir is always inside the working temp directory
    const absolutePath = path.join(this.dir, dir);

    return absolutePath;
  }

  public createDir(dir: string): void {
    const dirname = this.absolutePath(dir);
    makeDir.sync(dirname);
  }

  public createFile(file: string, contents: string): void {
    const filePath = this.absolutePath(file);
    const fileDir = path.parse(filePath).dir;
    makeDir.sync(fileDir);

    fs.writeFileSync(filePath, `${contents}\n`);
  }

  public getSpyPathCalls(spy: jest.Mock | jest.SpyInstance): Array<string> {
    const calls = spy.mock.calls;

    const result = calls.map((call): string => {
      const filePath = call[0];
      const relativePath = path.relative(this.dir, filePath);

      /**
       * Replace Windows backslash directory separators with forward slashes
       * so expected paths will be consistent cross platform
       */
      const normalizeCrossPlatform = normalizeDirectorySlash(relativePath);

      return normalizeCrossPlatform;
    });

    return result;
  }

  public clean(): Array<string> {
    const cleanPattern = normalizeDirectorySlash(this.absolutePath('**/*'));
    const removed = del.sync(cleanPattern, {
      dot: true,
      force: true,
    });

    return removed;
  }

  public deleteTempDir(): Array<string> {
    const removed = del.sync(normalizeDirectorySlash(this.dir), {
      force: true,
      dot: true,
    });

    return removed;
  }
}
