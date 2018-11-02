import {
  createContext,
  deserialize,
  resolveComponentEvaluables,
  serialize
} from '../../../src/utils'

// todo mock timers
jest.setTimeout(16000)

let context
let AwsApiGateway

const mocks = {
  importRestApi: jest.fn().mockReturnValue({ id: 'my-new-id' }),
  createDeployment: jest.fn(),
  putRestApi: jest.fn(),
  deleteRestApi: jest.fn()
}

const provider = {
  getSdk: () => {
    return {
      APIGateway: function() {
        return {
          importRestApi: (obj) => ({ promise: () => mocks.importRestApi(obj) }),
          createDeployment: (obj) => ({ promise: () => mocks.createDeployment(obj) }),
          putRestApi: (obj) => ({ promise: () => mocks.putRestApi(obj) }),
          deleteRestApi: (obj) => ({ promise: () => mocks.deleteRestApi(obj) })
        }
      }
    }
  },
  region: 'us-east-1'
}

beforeEach(() => {
  jest.clearAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('AwsApiGateway', () => {
  beforeEach(async () => {
    context = await createContext({}, { app: { id: 'test' } })
    AwsApiGateway = await context.loadType('AwsApiGateway')
  })

  it('should create ApiGateway if first deployment', async () => {
    const inputs = {
      provider,
      apiName: 'something',
      role: { arn: 'someArn' },
      routes: {}
    }
    let awsApiGateway = await context.construct(AwsApiGateway, inputs)
    awsApiGateway = resolveComponentEvaluables(awsApiGateway)

    await awsApiGateway.deploy(undefined, context)

    const createDeploymentParams = {
      restApiId: 'my-new-id',
      stageName: 'dev'
    }

    expect(mocks.importRestApi).toHaveBeenCalledTimes(1)
    expect(mocks.createDeployment).toBeCalledWith(createDeploymentParams)
    expect(awsApiGateway.id).toEqual('my-new-id')
  })

  it('should update service if changed', async () => {
    const inputs = {
      provider,
      apiName: 'somethingNew',
      role: { arn: 'someArn' },
      routes: {}
    }
    let awsApiGateway = await context.construct(AwsApiGateway, inputs)
    awsApiGateway = resolveComponentEvaluables(awsApiGateway)

    const prevInstance = {
      apiName: 'something',
      id: 'new-new-id',
      url: 'http://example.com/'
    }

    await awsApiGateway.deploy(prevInstance, context)

    expect(mocks.putRestApi).toHaveBeenCalledTimes(1)
    expect(mocks.createDeployment).toBeCalledWith({ restApiId: prevInstance.id, stageName: 'dev' })
  })

  it('should remove deployment', async () => {
    const inputs = {
      provider,
      apiName: 'somethingNew',
      role: { arn: 'someArn' },
      routes: {}
    }
    const prevInstance = {
      provider,
      id: 'something'
    }
    const awsApiGateway = await context.construct(AwsApiGateway, inputs)
    Object.assign(awsApiGateway, prevInstance)

    await awsApiGateway.remove(context)

    expect(mocks.deleteRestApi).toBeCalledWith({ restApiId: prevInstance.id })
  })

  it('shouldDeploy should return undefined if nothing changed', async () => {
    let oldAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'somethingOld',
      role: { arn: 'someArn' },
      routes: {}
    })
    oldAwsApiGateway = await context.defineComponent(oldAwsApiGateway)
    oldAwsApiGateway = resolveComponentEvaluables(oldAwsApiGateway)
    await oldAwsApiGateway.deploy(null, context)

    const prevAwsApiGateway = await deserialize(serialize(oldAwsApiGateway, context), context)

    let newAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'somethingOld',
      role: { arn: 'someArn' },
      routes: {}
    })
    newAwsApiGateway = await context.defineComponent(newAwsApiGateway)
    newAwsApiGateway = resolveComponentEvaluables(newAwsApiGateway)

    const res = newAwsApiGateway.shouldDeploy(prevAwsApiGateway)
    expect(res).toBe(undefined)
  })

  it('shouldDeploy should return replace if name changed', async () => {
    let oldAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'somethingOld',
      role: { arn: 'someArn' },
      routes: {}
    })
    oldAwsApiGateway = await context.defineComponent(oldAwsApiGateway)
    oldAwsApiGateway = resolveComponentEvaluables(oldAwsApiGateway)
    await oldAwsApiGateway.deploy(null, context)

    const prevAwsApiGateway = await deserialize(serialize(oldAwsApiGateway, context), context)

    let newAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'somethingNew',
      role: { arn: 'someArn' },
      routes: {}
    })
    newAwsApiGateway = await context.defineComponent(newAwsApiGateway)
    newAwsApiGateway = resolveComponentEvaluables(newAwsApiGateway)

    const res = newAwsApiGateway.shouldDeploy(prevAwsApiGateway)
    expect(res).toBe('replace')
  })

  it('shouldDeploy should return deploy if routes changed', async () => {
    let oldAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'something',
      role: { arn: 'someArn' },
      routes: { '/path': null }
    })
    oldAwsApiGateway = await context.defineComponent(oldAwsApiGateway)
    oldAwsApiGateway = resolveComponentEvaluables(oldAwsApiGateway)
    await oldAwsApiGateway.deploy(null, context)

    const prevAwsApiGateway = await deserialize(serialize(oldAwsApiGateway, context), context)

    let newAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'something',
      role: { arn: 'someArn' },
      routes: { '/anotherPath': null }
    })
    newAwsApiGateway = await context.defineComponent(newAwsApiGateway)
    newAwsApiGateway = resolveComponentEvaluables(newAwsApiGateway)

    const res = newAwsApiGateway.shouldDeploy(prevAwsApiGateway)
    expect(res).toBe('deploy')
  })

  it('shouldDeploy should return deploy if first deployment', async () => {
    let oldAwsApiGateway = await context.construct(AwsApiGateway, {
      provider,
      apiName: 'something',
      role: { arn: 'someArn' },
      routes: { '/another': null }
    })
    oldAwsApiGateway = await context.defineComponent(oldAwsApiGateway)
    oldAwsApiGateway = resolveComponentEvaluables(oldAwsApiGateway)
    const res = oldAwsApiGateway.shouldDeploy(null, context)
    expect(res).toBe('deploy')
  })
})
