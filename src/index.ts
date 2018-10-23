import {call} from 'redux-saga/effects';

const RESTART = '@@saga/RESTART';
const FAIL = '@@saga/FAIL';

const warn = (disableWarnings: boolean | undefined, warning: string) => {
    if (!disableWarnings) {
        console.warn(warning);
    }
};

class KeepAliveOptions {
    public defaultBehavior?: string = RESTART;
    public disableWarnings?: boolean = false;
    public maxAttempts?: number = -1;
    public onEachError?: () => void = () => {
    }
    public onFail?: (error: any, name: string, attempts: number) => void = () => {
    }
}

export const keepAlive = (saga: any, options: KeepAliveOptions = new KeepAliveOptions()) => {
    let attempts = 0;
    let lastError: any = null;

    let areAttemptsInfinite = true;
    if (options.maxAttempts !== -1) {
        areAttemptsInfinite = false;
    }

    return function* restart(...args: any[]) {
        while (attempts < (options.maxAttempts as number) || areAttemptsInfinite) {
            try {
                yield call(saga, args);
            } catch (error) {
                lastError = error;
                let shouldStop = false;
                if (typeof options.onEachError === 'function') {
                    let nextAction = null;
                    const getNextAction = (action: any) => {
                        nextAction = action;
                    };
                    yield call(options.onEachError, getNextAction, error, saga.name, attempts);
                    const result = nextAction || options.defaultBehavior;
                    shouldStop = result === FAIL;
                }
                if (shouldStop) {
                    break;
                }
                attempts += 1;
                warn(options.disableWarnings, `Restarting ${saga.name} because of error`);
            }
        }

        if (typeof options.onFail === 'function') {
            yield options.onFail(lastError, saga.name, attempts);
        } else if (!options.disableWarnings) {
            warn(options.disableWarnings, `Saga ${saga.name} failed after ${attempts}/${options.maxAttempts} attempts without any onFail handler`);
        }
    };
};
