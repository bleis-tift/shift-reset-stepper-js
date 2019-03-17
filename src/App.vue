<template>
  <div id="app">
    <textarea v-model="program">
    </textarea><br/>
    <input type='button' value='parse' v-on:click="parse"></input>
    <p>{{error}}</p>
    <pre>{{code}}</pre>
    <ol>
      <li v-for='(step, index) in steps' :key='index' class='ocha'>
        {{printExpr(step)}}
      </li>
    </ol>
    <input type='button' value='reduce' v-on:click="reduce" v-if='hasParsed'></input>
  </div>
</template>

<script>
import * as parser from './ocha/parser.js'
import * as printer from './ocha/printer.js'
import * as stepper from './ocha/stepper.js'

export default {
  name: 'app',
  components: {
  },
  data() {
    return {
      program:
        'let get () = shift (fun k -> fun state -> k state state);;\n' +
        'let return result = fun _ -> result;;\n' +
        'let run_state thunk init = reset (fun () -> return (thunk ())) init;;\n' +
        'run_state (fun () -> get () + get ()) 3;;',
      error: '',
      code: '',
      steps: [],
      parsed: '',
    };
  },
  computed: {
    hasParsed() {
      return this.code !== '';
    }
  },
  methods: {
    parse() {
      if (!this.program) {
        return;
      }
      try {
        this.error = '';
        this.parsed = parser.parse(this.program, {});
        this.code = printer.printAst(this.parsed);
        this.steps = [this.parsed.expr];
      } catch (e) {
        this.error = e;
        this.parsed = '';
        this.code = '';
        this.steps = [];
      }
    },
    reduce() {
      if (this.steps.length == 0) {
        return;
      }
      const target = this.steps[this.steps.length - 1];
      const res = stepper.step(this.parsed.defs, target);
      this.steps.push(res);
    },
    printExpr(expr) {
      return printer.printExpr(expr);
    },
  },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}
textarea {
  min-width: 500px;
  min-height: 200px;
}
.ocha {
  font-family: monospace;
}
</style>
