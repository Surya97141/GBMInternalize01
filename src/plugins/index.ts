import { DEFAULT_REGISTRY } from '../engine/pluginRegistry'
import { TracerPlugin } from './tracer'

DEFAULT_REGISTRY.register('TRACER', TracerPlugin)
