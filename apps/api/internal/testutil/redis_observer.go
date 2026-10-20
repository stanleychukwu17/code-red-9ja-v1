package testutil

import (
	"context"
	"github.com/redis/go-redis/v9"
)

type RedisObserver struct {
	Before func(context.Context, redis.Cmder)
}

func (h RedisObserver) DialHook(next redis.DialHook) redis.DialHook { return next }
func (h RedisObserver) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return next
}
func (h RedisObserver) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		h.Before(ctx, cmd)
		return next(ctx, cmd)
	}
}
