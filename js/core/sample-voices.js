/**
 * Polyphonic pool of Tone.Player voices for pitched sample playback.
 * @param {import('tone').InputNode} destination
 * @param {number} [voiceCount=8]
 */
export function createSampleVoicePool(destination, voiceCount = 8) {
  const voices = Array.from({ length: voiceCount }, () => ({
    player: new Tone.Player().connect(destination),
    busyUntil: 0,
  }));

  return {
    voices,

    setBuffer(buffer) {
      voices.forEach((v) => { v.player.buffer = buffer; });
    },

    /**
     * @param {number} time
     * @param {number} playbackRate
     * @param {number} durationSec
     * @param {number} volume
     */
    trigger(time, playbackRate, durationSec, volume = 1) {
      const now = Tone.now();
      let voice = voices.find((v) => v.busyUntil <= now);
      if (!voice) voice = voices[0];
      if (!voice.player.loaded) return;

      voice.player.stop(time);
      voice.player.playbackRate = playbackRate;
      voice.player.volume.value = Tone.gainToDb(volume);
      voice.player.start(time);
      voice.player.stop(time + durationSec);
      voice.busyUntil = time + durationSec;
    },

    dispose() {
      voices.forEach((v) => v.player.dispose());
    },
  };
}
