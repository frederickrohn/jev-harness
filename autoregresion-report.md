# Jev autoregression experiment report

## Goal

This experiment tests whether repeated Jev `Choice` calls can imitate an autoregressive language model. The endpoint asks an open-ended question, gives Jev the letters `a-z` and `stop`, and appends one selected letter per iteration to produce a single-word answer.

This is intentionally an unusual use of Jev. Jev selects among supplied options; it does not generate arbitrary text or retain hidden state between API calls.

## Current implementation

`POST /autoregressive-chat` runs at most 20 iterations. On every iteration it sends the question and `answer_so_far`, then asks Jev to select the next letter or `stop`.

If Choice confidence is below `0.3`, the endpoint makes one additional call using the five options with the highest probabilities from the first call. The second result becomes the selected character. The response reports the answer, iteration count, stopping reason, and combined token usage.

## Approaches tested

### Static character criteria

The first version described each option only as the next character, such as `The next character is 't'`.

For `What animal says meow?`, Jev repeatedly returned `caa`. At the prefix `ca`, the expected `t` was not among the five highest-probability choices. This showed that supplying a letter as an available option does not mean Jev will connect it to the intended complete word.

### Dynamic prefix criteria

The next version showed the result of every possible append operation. At `ca`, for example, the `t` criterion described the resulting prefix `cat`.

This made each option more concrete, but the original question produced `mew` instead of `cat`: Jev followed the sound associated with “meow.” More explicit questions worked better:

- `Which animal is the source of the sound meow? Return the animal, not the sound.` produced `cat`.
- `What household pet has whiskers, purrs, and hunts mice?` produced `cat`.

This showed that precise question wording matters and that Jev may select a strong semantic association instead of the answer category the caller intended.

### Conditional top-five reranking

When the initial Choice confidence fell below `0.3`, a second Choice call considered only the first call's five highest-probability options.

The reranker sometimes concentrated the distribution, but it could not recover a correct letter omitted from the top five. It could also overturn a useful first ranking. At the prefix `ap`, the first call ranked `e` highest at `0.21`; the reranker selected `p` at `0.33` instead.

The reranker remains in the experiment because it is a small, measurable strategy for uncertain choices, but its result is another independent judgment rather than guaranteed deeper reasoning.

A later Jakarta run exposed another failure mode. The loop reached `jaka` correctly. The first pass then ranked `s`, `i`, `stop`, `n`, and `r`; the reranker selected `n`, producing `jakan` instead of continuing toward `jakarta`. From iteration 7 onward, `stop` was usually the first pass's highest-probability option, but the low-confidence reranker repeatedly selected another letter. The run exhausted all 20 iterations with `jakanaianiakiaianian`.

This suggests that reranking can create a continuation bias. Reducing the candidate set often made a letter distribution more concentrated while demoting `stop`, even when the first pass preferred stopping. Choice confidence describes how concentrated the current distribution is; it does not establish that the selected character keeps the whole word correct.

### Asking Jev to remember a complete answer

The instructions told Jev to determine the complete answer internally and then spell that fixed answer one character at a time.

This did not create persistent planning across calls. Each iteration is a new request and can only use the explicit state supplied by the application. Examples included:

- `What large land animal has a trunk and tusks?` produced `eat` instead of `elephant`.
- `What city in South East Asia is the capital of Indonesia?` produced `jakan` instead of `jakarta`.

The instruction could influence an individual judgment, but there was no hidden target word shared by later requests.

### Prefix viability and one-character deletion

A `Noul` judged whether `answer_so_far` could lead to a correct answer. A value below `0.5` deleted the last character and excluded that character when retrying the parent prefix.

The deletion mechanism worked mechanically. For the elephant question, `eat` received viability `0.21`, so `t` was deleted and excluded under `ea`. The search then tried `ear`, `eas`, and longer incorrect branches.

The viability judgment was too permissive to guide lexical search. Observed values included:

- `e`: `0.79`
- `ea`: `0.81`
- `eas`: `0.76`
- `easp`: `0.74`
- `easpaneper`: `0.53`

There was no useful threshold separating correct prefixes from incorrect ones. Raising the threshold enough to reject some nonsense could also reject valid prefixes.

### Separate completion and viability judgments

The combined Noul was split into two questions: whether the current text was a complete correct answer, and whether it could still be extended into one. This prevented prefix viability from directly authorizing completion.

The completion judgment stayed low for nonsense, but viability still remained high. In one elephant run:

- Jev selected `a` first while `e` was second.
- `a` received viability `0.94`.
- `ap` received viability `0.90`.
- Longer text such as `appeangalesspaleamp` continued receiving viability above `0.5`.

Because viability never crossed the deletion threshold, no backtracking occurred.

### Two-level deletion

The search was changed to reject a parent prefix after three of its child letters had been rejected. This was meant to escape an earlier locally attractive branch.

It still depended on the viability Noul rejecting children. In the run above, the Noul accepted every increasingly incorrect prefix, so the first deletion layer never activated and the second layer had nothing to count. More backtracking machinery could not compensate for an unreliable search signal.

## What the experiment revealed

Jev can sometimes spell short answers with very strong associations, especially when the question clearly specifies the expected answer category. It did not produce a reliable next-character distribution for longer open-vocabulary answers.

One cat run demonstrates the successful case clearly:

| Prefix | Choice | Confidence | Leading probability |
| --- | --- | ---: | ---: |
| empty | `c` | `0.47` | `c: 0.50` |
| `c` | `a` | `0.77` | `a: 0.79` |
| `ca` | `t` | `0.92` | `t: 0.93` |
| `cat` | `stop` | `1.00` | `stop: 1.00` |

No reranking was needed. Confidence increased as the familiar word became constrained, and Jev recognized the exact completion decisively. Compared with the Jakarta run, this shows two distinct regimes: a short, strongly associated answer can converge cleanly, while one uncertain character in a longer answer can move the loop into a self-reinforcing sequence with no recovery mechanism.

The main limitation is architectural. Jev ranks options using the current state, but the loop needs a stable target word and a reliable lexical prefix test. Neither exists in the current state. The same model proposing a character and judging whether its accumulated output remains viable also creates correlated errors.

The observed behavior resembles a local maximum: an early plausible letter changes the context, later calls find locally plausible continuations, and the loop moves farther from the intended word. A search or delete strategy only helps when its evaluator can reliably recognize the bad path.

## Possible follow-up: remembered incorrect prefixes

One untested alternative is to let Jev select an `incorrect_prefix` outcome when it believes the current attempt cannot produce a correct answer. The application would restart the answer and include an `incorrect_prefixes` array in future state, for example:

```json
{
  "question": "What large land animal has a trunk and tusks?",
  "answer_so_far": "",
  "incorrect_prefixes": ["a", "ap", "eat"]
}
```

This would give later calls explicit memory of failed attempts without maintaining a prefix tree. It may steer Jev away from repeated mistakes, but it still asks Jev to recognize its own invalid prefix, which was the unreliable part of the deletion experiments. It should be tested as a separate strategy rather than added to the current baseline.

Another practical direction is to use one small generative-model call to propose several complete one-word answers and let Jev select among them. That would give Jev meaningful complete candidates while keeping the final decision in Jev.
