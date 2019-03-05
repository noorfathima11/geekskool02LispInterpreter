let env = {
  '+': (args) => { return args.reduce((a, b) => a * 1 + b * 1) },
  '-': (args) => { return args.reduce((a, b) => a * 1 - b * 1) },
  '*': (args) => { return args.reduce((a, b) => (a * 1) * (b * 1)) },
  '/': (args) => { return args.reduce((a, b) => a * 1 / b * 1) },
  '>': (args) => { return args.reduce((a, b) => a * 1 > b * 1) },
  '<': (args) => { return args.reduce((a, b) => a * 1 < b * 1) },
  '>=': (args) => { return args.reduce((a, b) => a * 1 >= b * 1) },
  '<=': (args) => { return args.reduce((a, b) => a * 1 <= b * 1) },
  '===': (args) => { return args.reduce((a, b) => a * 1 === b * 1) },
  'pi': 3.14159,
  'abs': (x) => { return Math.abs(x) },
  'append': (args) => { return args.reduce((a, b) => a + b) },
  'apply': function lambda (proc, args) { return proc(...args) },
  'begin': function lambda (...x) { return x[-1] },
  'car': function lambda (x) { return x[0] }
}
let readline = require('readline')
let rl = readline.createInterface(process.stdin, process.stdout)
rl.setPrompt('> ')
rl.prompt()
rl.on('line', function (input) {
  if (input === 'exit') rl.close()
  let evaluated = evaluator(input.toString())
  console.log('final', evaluated)
  rl.prompt()
}).on('close', function () {
  process.exit(0)
})

let factoryParser = function (...parsers) {
  // console.log('factory parser input', ...parsers)
  return input => {
    let spaceCheck
    input = (spaceCheck = spaceParser(input)) ? spaceCheck[1] : input
    for (let parser of parsers) {
      let result = parser(input)
      if (result !== null) return result
    }
    return null
  }
}

let props = Object.keys(env)
let arithmeticOperators = ['+', '-', '*', '/', '>', '<', '>=', '<=', '===']

// Block of parsers -----------------------------------------------------------------------------------------------------------------------------------------------------
let numberParser = (input, num, regEx = /^(-?(0|[1-9]\d*))(\.\d+)?(((e)(\+|-)?)\d+)?/ig) => (num = input.match(regEx)) ? [num[0] * 1] : null

let symbolParser = input => {
  console.log('symbolParser input', input)
  let remaining = ''
  let actual = ''
  if (!input.startsWith("'")) return null
  let inputRaw = input.substr(1)
  for (let i = 1; i < inputRaw.length; i++) {
    if (inputRaw.charAt(i) === "'" && inputRaw.charAt(i - 1) !== '\\') {
      actual = inputRaw.slice(0, i + 1).slice(0, -1)
      remaining = inputRaw.slice((i + 1))
      break
    }
    if (/\\/.test(inputRaw.charAt(i)) && /\\/.test(inputRaw.charAt(i - 1)) && /'/.test(inputRaw.charAt(i + 1))) {
      if (inputRaw.charAt(i - 2) === '\\') continue
      actual = "\\'"
      remaining = inputRaw.slice(i + 2)
      break
    }
  }
  if (/\\\\'/.test(actual)) return [actual, remaining]
  if (inputRaw.charAt(0) === '"') {
    actual = ''
    remaining = inputRaw.slice(1)
    return [actual, remaining]
  }
  for (let i = 1; i < actual.length; i++) {
    if (actual.charAt(i) === '\\') {
      let slashCheck = (actual.charAt(i + 1) === "'") || actual.charAt(i + 1) === '\\' || actual.charAt(i + 1) === '/' ||
      actual.charAt(i + 1) === 'b' || actual.charAt(i + 1) === 'f' || actual.charAt(i + 1) === 'n' ||
      actual.charAt(i + 1) === 'n' || actual.charAt(i + 1) === 'r' || actual.charAt(i + 1) === 't' || actual.charAt(i + 1) === 'u'
      if (slashCheck === false) return null
      if (actual.charAt(i + 1) === 'u') {
        let hexCheck = actual.slice(i + 1, i + 6)
        for (let i = 0; i < hexCheck.length; i++) {
          if (/u(\d|[A-F]){4}/i.test(hexCheck) !== true) return null
        }
      }
    }
  }
  return [actual]
}
// Identifier Parser ------------------------------------------------------------------------------------------
let identifierParser = (inputArray) => {
  console.log('identifierInput', inputArray)
  if (inputArray[0] === 'define') {
    return definitionInterpreter(inputArray)
  }
  if (inputArray[0] === 'if') {
    return conditionalInterpreter(inputArray)
  }

  if (inputArray[0] === 'quote') {
    return quotationInterpreter(inputArray)
  }

  if (env.hasOwnProperty(inputArray[0])) {
    if (arithmeticOperators.includes(inputArray[0])) {
      console.log('arithmetic input', inputArray)
      return arithmeticEvaluator(inputArray)
    }
    let evalExp = lambdaEvaluate(inputArray)
    console.log('evalExp', evalExp)
    return evalExp
  }

  return arithmeticEvaluator(inputArray)
}

// Quotation Interpreter -------------------------------------------------------------------------------------
let quotationInterpreter = (inputArray) => {
  inputArray = inputArray.slice(1)
  console.log('quote sliced inputArray', inputArray.join(' '))
  return inputArray.join(' ')
}

// Conditional Interpreter -----------------------------------------------------------------------------------
let conditionalInterpreter = (inputArray) => {
  console.log('conditional input', inputArray)
  inputArray = inputArray.slice(1)
  console.log('inputArray in cond', inputArray)
  let cond = simpleExpression(inputArray)
  console.log('simple cond received', cond)
  if (cond === 'not simple') {
    cond = nestedExpression(inputArray)
    console.log('nested cond received', cond)
  }
  let conseq = simpleExpression(inputArray.slice(cond.length))
  console.log('simple conseq received', conseq)
  if (conseq === 'not simple') {
    conseq = nestedExpression(inputArray.slice(cond.length))
    console.log('nested conseq received', conseq)
  }
  let alt = simpleExpression(inputArray.slice(cond.length + conseq.length))
  console.log('simple alt received', alt)
  if (alt === 'not simple') {
    alt = nestedExpression(inputArray.slice(cond.length + conseq.length))
    console.log('nested alt received', alt)
  }
  let isCond
  if (cond.length === 1) {
    isCond = expressionParser(cond)
    console.log('here', isCond)
  } else {
    isCond = expressionParser(cond.join(' '))
    console.log('isCond', isCond)
  }
  if (isCond[0]) {
    let isConseq
    if (conseq.length === 1) {
      isConseq = expressionParser(conseq)
      console.log('here1', isConseq)
      return isConseq
    }
    isConseq = expressionParser(conseq.join(' '))
    console.log('isConseq', isConseq)
    return isConseq
  }
  let isAlt
  if (alt.length === 1) {
    isAlt = expressionParser(alt)
    console.log('here1', isAlt)
    return isAlt
  }
  isAlt = expressionParser(alt.join(' '))
  console.log('isAlt', isAlt)
  return isAlt
}
function simpleExpression (inputArray) {
  console.log('simple expression', inputArray)
  let openBracePos = []
  let openBraceCount = 0
  let j = 0
  let closeBracePos = []
  let k = 0
  let key
  if (inputArray[0] !== '(') {
    return inputArray[0]
  }
  for (let i = 0; i < inputArray.length; i++) {
    if (inputArray[i] === '(') {
      openBracePos[j++] = i
      console.log('openBracePos, j', openBracePos, j)
      openBraceCount++
      if (openBraceCount > 1) return 'not simple'
      key = inputArray[i + 1]
      console.log('key in cond', key)
    }
    if (inputArray[i] === ')') {
      closeBracePos[k++] = i
      console.log('closeBracePos, k', closeBracePos, k)
      if (closeBracePos[k - 1] - openBracePos[j - 1] === 4) {
        console.log('diff is 4')
        return inputArray.slice(openBracePos[j - 1], closeBracePos[k - 1] + 1)
      }
    }
  }
  return null
}
function nestedExpression (inputArray) {
  let openBracePos = []
  let j = 0
  let closeBracePos = []
  let k = 0
  let key
  for (let i = 1; i < inputArray.length; i++) {
    if (inputArray[i] === '(') {
      openBracePos[j++] = i
      key = inputArray[i + 1]
      console.log('key in cond', key)
    }
    console.log('openBracePos, j-1', openBracePos, j - 1)
    if (inputArray[i] === ')') {
      closeBracePos[k++] = i
      console.log('closeBracePos, k', closeBracePos, k)
      if (closeBracePos[k - 1] - openBracePos[j - 1] === 4) {
        console.log('diff is 4')
        openBracePos.splice(--j)
        console.log('spliced openBracePos', openBracePos)
        closeBracePos.splice(--k)
        console.log('spliced closeBracePos', closeBracePos)
      } else {
        console.log('diff is not 4')
        console.log('diff is ' + (closeBracePos[k - 1] - openBracePos[j - 1]))
        console.log('cond', inputArray.slice(openBracePos[j - 1], closeBracePos[k - 1] + 1))
        return inputArray.slice(openBracePos[j - 1], closeBracePos[k - 1] + 1)
      }
    }
  }
}

// definition parser ------------------------------------------------------------------------------------------
let definitionInterpreter = (inputArray) => {
  console.log('defineInput', inputArray)
  let value = inputArray.slice(2)
  console.log('value', value)
  let functionName = inputArray[1]
  console.log('functionName', functionName)
  if (value[1] === 'lambda') {
    let lambda = lambdaUpdate(value)
    console.log('received lambda', lambda)
    env[functionName] = lambda
    console.log('env', env)
    props = Object.keys(env)
    console.log('new keys', props)
    return 'Global environment updated'
  }
  console.log('not lambda')
  let finalResult = expressionParser(value.join(' '))
  console.log('finalResult', finalResult)
  if (finalResult === null) return null
  env[`${inputArray[1]}`] = finalResult
  console.log('env', env)
  return 'Global Object successfully updated'
}

// lambda ---------------------------------------------------------------------------------------------------------
let lambdaUpdate = (input) => {
  console.log('lambda input', input)
  input = input.slice(1, input.length - 1)
  console.log('sliced input', input)
  let argOpenBrace = 0
  let argCloseBrace = 0
  for (let i = 1; i < input.length; i++) {
    if (input[i] === '(') argOpenBrace = i
    console.log('argOpenBrace', argOpenBrace)
    if (input[i] === ')') {
      argCloseBrace = i
      console.log('argCloseBrace', argCloseBrace)
      break
    }
  }
  let param = input.slice(argOpenBrace + 1, argCloseBrace)
  console.log('parameters', param)
  let expression = input.slice(argCloseBrace + 1)
  console.log('expression', expression)

  let local = {}
  local['localEnv'] = env
  local['args'] = {}
  for (let i = 0; i < param.length; i++) {
    local.args[[param[i]]] = null
  }
  local['eval'] = expression
  console.log('localEnv', local)
  return local
}

let lambdaEvaluate = (inputArray) => {
  let proc = inputArray[0]
  console.log('procedure', proc)
  let params = inputArray.slice(1)
  console.log('parameters', params)
  let evalParams = expressionParser(params.join(' '))
  console.log('evalParams', evalParams)
  evalParams = evalParams.toString().split(' ')
  console.log('evalParamsArray', evalParams)
  let keys = Object.keys(env[proc].args)
  console.log('keys', keys)
  for (let i = 0; i < keys.length; i++) {
    for (let ele in env[proc].args) {
      if (ele === keys[i]) {
        env[proc].args[ele] = evalParams[i]
      }
    }
  }
  let variable = /[A-Z]/i
  console.log('updated local env', env)
  for (let key in env[proc].args) {
    for (let i = 0; i < env[proc].eval.length; i++) {
      if (env[proc].eval[i] === key) {
        env[proc].eval[i] = env[proc].args[key]
        console.log('mapped', env[proc].eval[i])
      }
      if (variable.test(env[proc].eval[i])) {
        console.log('yes', env[proc].eval[i])
        if (env.hasOwnProperty(env[proc].eval[i]) && (env[proc].eval[i] !== proc)) {
          env[proc].eval[i] = env[env[proc].eval[i]]
        }
      }
    }
  }

  console.log('updated local env1', env)

  // send eval to sExpression parser
  let result = sExpressionParser(env[proc].eval.join(' '))
  console.log('evaluated result', result)
  return result
}

// arithmetic evaluator ------------------------------------------------------------------------------------------
let arithmeticEvaluator = (input) => {
  console.log('aeval', input)
  for (let i = 0; i < input.length; i++) {
    if (arithmeticOperators.includes(input[i])) continue
    if (env.hasOwnProperty(input[i])) input[i] = env[input[i]]
  }
  let inputArray = input.slice(0)
  let endIndex
  let slicedArray
  let key
  let result = []
  let k = 0
  let finalResult = []
  if (inputArray[0] === '(' || inputArray[inputArray.length - 1] === ')') {
    for (let i = inputArray.length - 1; i >= 0; i--) {
      if (inputArray[i] === ')') endIndex = i
      console.log('endIndex', endIndex)
      if (inputArray[i] === '(') {
        key = inputArray[i + 1]
        console.log('key', key)
        slicedArray = inputArray.slice(i + 2, endIndex)
        console.log('slicedArray', slicedArray)
        if (slicedArray.length !== 2) return null
        console.log('slicedArray1', slicedArray)
        result[k++] = env[key](slicedArray)
        console.log('envResult', result)
      }
    }
  } else {
    // (< 3 4)
    slicedArray = inputArray.slice(1, endIndex)
    console.log('slicedArray2', slicedArray)
    if (slicedArray.length === 2) {
      finalResult = env[inputArray[0]](slicedArray)
      console.log('finalResult2', finalResult)
      return finalResult
    } else {
      let openBracePos
      let closeBracePos
      let res = []
      let j = 0
      for (let i = 0; i <= inputArray.length; i++) {
        // < (+ 3 6) 4
        if (inputArray[i] === '(') {
          openBracePos = i
          console.log('openBrace', openBracePos)
        }
        if (inputArray[i] === ')') {
          closeBracePos = i
          console.log('closeBrace', closeBracePos)
          slicedArray = inputArray.slice(openBracePos + 2, closeBracePos)
          console.log('sliced Array3', slicedArray)
          let key1 = inputArray[openBracePos + 1]
          console.log('key1', key1)
          res[j++] = env[key1](slicedArray)
          console.log('res', res)
        }
      }
      res[j++] = inputArray[inputArray.length - 1] * 1
      console.log('finalres', res)
      finalResult = env[inputArray[0]](res)
      console.log('finalResult0', finalResult)
      return finalResult
    }
  }

  if (inputArray[0] !== '(') {
    console.log('result array1', inputArray)
    if (isNaN(inputArray[1]) * 1) {
      key = inputArray[0]
      console.log('key1', key)
      result.reverse()
      console.log('reversed result1', result)
      finalResult = env[inputArray[0]](result)
      console.log('finalResult1', finalResult)
      return finalResult
    } else result[k++] = inputArray[1] * 1
  }
  console.log('result array', result)
  result.reverse()
  console.log('reversed result', result)
  finalResult = env[inputArray[0]](result)
  console.log('finalResult', finalResult)

  return finalResult
}

// S Expression Parser --------------------------------------------------------------------------------------------
let sExpressionParser = (input) => {
  input = input.trim()
  console.log('sExpinp', input)
  console.log('props', props)
  if (!input.startsWith('(')) return null
  let braceCount = 0
  for (let i = 0; i < input.length; i++) {
    // console.log(input.charAt(i))
    if (input.charAt(i) === '(' || input.charAt(i) === ')') braceCount++
    // console.log('braceCount', braceCount)
  }
  // console.log('braceCount', braceCount)
  if (braceCount % 2 !== 0) return 'invalid input, missing brace'
  input = input.substr(1).slice(0, -1)
  input = input.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ')
  console.log('removed braces', input)
  let inputArray = input.split(' ')
  console.log('inputArray', inputArray)
  inputArray = inputArray.filter((ele) => { return /\S/.test(ele) })
  console.log('inputArray without spaces', inputArray)
  let result = identifierParser(inputArray)
  if (result === null) return null
  return result
}

// ---------------------------------------------------------------------------------------------------------
let spaceParser = input => input.match(/^[\n*\s\n*]/) ? [null, input.slice(input.match(/\S/).index)] : null
let commaParser = input => input.startsWith(',') ? [null, input.slice(1)] : null

let expressionParser = factoryParser(numberParser, symbolParser, sExpressionParser)

let evaluator = (input) => {
  console.log('inp', input)
  // can be replaced by trim???
  let spaceCheck
  input = (spaceCheck = spaceParser(input)) ? spaceCheck[1] : input
  console.log('new input', input)
  let id = []
  let parsePass

  parsePass = expressionParser(input)
  console.log('parsePass', parsePass)
  if (parsePass === null) {
    if (env.hasOwnProperty(input)) return env[input]
    return null
  }
  if (parsePass !== null) {
    id = parsePass
    console.log('return id', id)
    return id
  }
}
