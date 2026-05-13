import { useEffect, useRef } from 'react';

function loadYoutubeIframeApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.body.appendChild(tag);
  });
}

function storageKeys(videoId) {
  return {
    maxTime: `yt_progress_max_time_${videoId}`,
    unlocked: `yt_progress_unlocked_${videoId}`,
  };
}

export function useYoutubeProgress(videoId, onThreshold) {
  const playerRef = useRef(null);
  const reachedRef = useRef(false);
  const maxWatchedRef = useRef(0);
  const skipCorrectionRef = useRef(false);
  const cbRef = useRef(onThreshold);
  cbRef.current = onThreshold;

  useEffect(() => {
    if (!videoId) return undefined;
    const keys = storageKeys(videoId);
    const savedMax = Number(localStorage.getItem(keys.maxTime) || 0);
    const savedUnlocked = localStorage.getItem(keys.unlocked) === '1';
    maxWatchedRef.current = Number.isFinite(savedMax) ? Math.max(0, savedMax) : 0;
    reachedRef.current = savedUnlocked;
    if (savedUnlocked) {
      cbRef.current?.();
    }

    let destroyed = false;
    let pollId;

    (async () => {
      await loadYoutubeIframeApi();
      if (destroyed || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            const p = playerRef.current;
            if (p && maxWatchedRef.current > 2) {
              p.seekTo(maxWatchedRef.current - 1, true);
            }

            pollId = window.setInterval(() => {
              try {
                const p = playerRef.current;
                if (!p || !p.getDuration || !p.getCurrentTime) return;
                const duration = p.getDuration();
                const current = p.getCurrentTime();
                if (current > maxWatchedRef.current) {
                  maxWatchedRef.current = current;
                  localStorage.setItem(keys.maxTime, String(maxWatchedRef.current));
                }

                if (duration > 0 && current / duration >= 0.9) {
                  if (!reachedRef.current) {
                    reachedRef.current = true;
                    localStorage.setItem(keys.unlocked, '1');
                    cbRef.current?.();
                  }
                }
              } catch {
                /* ignore player errors during teardown */
              }
            }, 800);
          },
          onStateChange: (event) => {
            try {
              const p = playerRef.current;
              if (!p || !p.getCurrentTime || !p.getDuration) return;
              if (skipCorrectionRef.current) return;

              const current = p.getCurrentTime();
              const duration = p.getDuration();
              if (!duration) return;

              // If user jumps ahead of what they've already watched, force back.
              const allowedMax = maxWatchedRef.current + 1.5;
              if (current > allowedMax) {
                skipCorrectionRef.current = true;
                p.seekTo(Math.max(0, maxWatchedRef.current), true);
                window.setTimeout(() => {
                  skipCorrectionRef.current = false;
                }, 200);
              }

              if (event?.data === window.YT?.PlayerState?.PAUSED) {
                if (current > maxWatchedRef.current) {
                  maxWatchedRef.current = current;
                  localStorage.setItem(keys.maxTime, String(maxWatchedRef.current));
                }
              }
            } catch {
              /* noop */
            }
          },
        },
      });
    })();

    return () => {
      destroyed = true;
      if (pollId) window.clearInterval(pollId);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, [videoId]);
}
