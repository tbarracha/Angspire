// Repositories (co-located with models for convenience)

using Genspire.Application.Modules.Agentic.Sessions.Domain.Models;
using MongoDB.Bson;
using MongoDB.Driver;
using SpireCore.API.Configuration.Modules;
using SpireCore.API.DbProviders.Mongo.Repositories;
using SpireCore.Services;

namespace Genspire.Application.Modules.Agentic.Sessions.Domain.Repositories
{
    public class SessionRepository : MongoAuditableEntityRepository<Session>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "Sessions";
        public SessionRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public class SessionTypeRepository : MongoAuditableEntityRepository<SessionType>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionTypes";
        public SessionTypeRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public class SessionHistoryRepository : MongoAuditableEntityRepository<SessionHistory>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionHistories";
        public SessionHistoryRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }

        // Convenience: fetch by (SessionId, TimelineId)
        public Task<SessionHistory?> GetForTimelineAsync(Guid sessionId, Guid timelineId)
            => FindAsync(h => h.SessionId == sessionId && h.TimelineId == timelineId);

        // Ensure a history exists for a timeline (idempotent upsert).
        public async Task<SessionHistory> EnsureForTimelineAsync(Guid sessionId, Guid timelineId)
        {
            var existing = await GetForTimelineAsync(sessionId, timelineId);
            if (existing is not null) return existing;

            var created = new SessionHistory { SessionId = sessionId, TimelineId = timelineId };
            return await AddAsync(created);
        }
    }

    public class SessionSummaryRepository : MongoAuditableEntityRepository<SessionSummary>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionSummaries";
        public SessionSummaryRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }

        // Latest summary for a timeline by SummarizedAt
        public async Task<SessionSummary?> GetLatestForTimelineAsync(Guid sessionId, Guid timelineId)
        {
            var filter = Builders<SessionSummary>.Filter.Where(s => s.SessionId == sessionId && s.TimelineId == timelineId);
            return await _collection.Find(filter).SortByDescending(s => s.SummarizedAt).FirstOrDefaultAsync();
        }
    }

    public class SessionTurnSummaryRepository : MongoAuditableEntityRepository<SessionTurnSummary>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionTurnSummaries";
        public SessionTurnSummaryRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }

        public Task<SessionTurnSummary?> GetForTurnAsync(Guid sessionTurnId)
            => FindAsync(s => s.SessionTurnId == sessionTurnId);
    }

    public class SessionTurnRepository : MongoAuditableEntityRepository<SessionTurn>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionTurns";
        public SessionTurnRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    /// <summary>
    /// Legacy linear message storage (kept for migration/back-compat).
    /// Uses the original collection name.
    /// </summary>
    public class SessionMessageDbRepository : MongoAuditableEntityRepository<SessionMessageDb>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionDbMessages"; // legacy collection
        public SessionMessageDbRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    /// <summary>
    /// New per-turn message storage (distinct from legacy linear messages).
    /// If you embed messages inside turns only, you may not need this repository;
    /// keeping it allows storing/retrieving messages as first-class docs if desired.
    /// </summary>
    public class SessionMessageRepository : MongoAuditableEntityRepository<SessionMessage>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionMessages"; // avoid clashing with legacy "SessionMessages"
        public SessionMessageRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public class TurnStepRepository : MongoAuditableEntityRepository<TurnStep>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "TurnSteps";
        public TurnStepRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public class SessionTimelineRepository : MongoAuditableEntityRepository<SessionTimeline>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionTimelines";
        public SessionTimelineRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public class SessionSettingsRepository : MongoAuditableEntityRepository<SessionSettings>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionSettings";
        public SessionSettingsRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }

        public Task<SessionSettings?> GetDefaultAsync()
            => FindAsync(s => s.IsDefault);
    }

    
    public class SessionStatsRepository : MongoAuditableEntityRepository<SessionStats>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionStats";
        public SessionStatsRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName) { }
    }

    public sealed class SessionFavoriteRepository : MongoAuditableEntityRepository<SessionFavorite>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionFavorites";
        public SessionFavoriteRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
        {
        }

        #region Queries ----------------------------------------------------------
        /// <summary>
        /// Returns every favorite for <paramref name = "userId"/>; optionally filters by
        /// <paramref name = "sessionTypeId"/>.
        /// </summary>
        public async Task<List<SessionFavorite>> GetFavoritesByUserAsync(string userId, Guid? sessionTypeId = null)
        {
            var filter = Builders<SessionFavorite>.Filter.Eq(f => f.UserId, userId);
            if (sessionTypeId is { } stid)
                filter &= Builders<SessionFavorite>.Filter.Eq(f => f.SessionTypeId, stid);
            /* Safety net ― ignore legacy docs whose _id was stored as ObjectId.
               (Prevents FormatException even before the data-cleanup script is run.) */
            filter &= Builders<SessionFavorite>.Filter.Type("_id", BsonType.String);
            return await _collection.Find(filter).ToListAsync();
        }

        /// <summary>True if <paramref name = "sessionId"/> is already favorited by <paramref name = "userId"/>.</summary>
        public async Task<bool> IsFavoriteAsync(string userId, string sessionId)
        {
            var filter = Builders<SessionFavorite>.Filter.And(Builders<SessionFavorite>.Filter.Eq(f => f.UserId, userId), Builders<SessionFavorite>.Filter.Eq(f => f.SessionId, sessionId));
            /* Same safety net as above */
            filter &= Builders<SessionFavorite>.Filter.Type("_id", BsonType.String);
            return await _collection.Find(filter).AnyAsync();
        }

        /// <summary>Returns only the session-ids for which the user set a favorite.</summary>
        public async Task<List<string>> GetFavoriteSessionIdsByTypeAsync(string userId, Guid? sessionTypeId = null)
        {
            var filter = Builders<SessionFavorite>.Filter.Eq(f => f.UserId, userId);
            if (sessionTypeId is { } stid)
                filter &= Builders<SessionFavorite>.Filter.Eq(f => f.SessionTypeId, stid);
            filter &= Builders<SessionFavorite>.Filter.Type("_id", BsonType.String);
            return await _collection.Find(filter).Project(f => f.SessionId).ToListAsync();
        }

        #endregion
        #region Commands ---------------------------------------------------------
        /// <summary>
        /// Upserts a favorite.  
        /// **Fix**: guarantees a <c>Guid</c> _id is written on insert.
        /// </summary>
        public async Task AddFavoriteAsync(string userId, string sessionId, Guid? sessionTypeId)
        {
            var filter = Builders<SessionFavorite>.Filter.And(Builders<SessionFavorite>.Filter.Eq(f => f.UserId, userId), Builders<SessionFavorite>.Filter.Eq(f => f.SessionId, sessionId));
            var update = Builders<SessionFavorite>.Update.SetOnInsert(f => f.Id, Guid.NewGuid()) // 👈 crucial
            .SetOnInsert(f => f.UserId, userId).SetOnInsert(f => f.SessionId, sessionId).SetOnInsert(f => f.SessionTypeId, sessionTypeId ?? Guid.Empty).SetOnInsert(f => f.FavoritedAt, DateTime.UtcNow);
            await _collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
        }

        /// <summary>Removes a single favorite.</summary>
        public async Task RemoveFavoriteAsync(string userId, string sessionId)
        {
            var filter = Builders<SessionFavorite>.Filter.And(Builders<SessionFavorite>.Filter.Eq(f => f.UserId, userId), Builders<SessionFavorite>.Filter.Eq(f => f.SessionId, sessionId));
            await _collection.DeleteOneAsync(filter);
        }
        #endregion
    }

    public class SessionMessageFeedbackRepository : MongoAuditableEntityRepository<SessionMessageFeedback>, ITransientService
    {
        private const string ModuleName = "GenAi";
        private const string CollectionName = "SessionMessageFeedbacks";
        public SessionMessageFeedbackRepository(IModuleDatabaseProvider provider) : base(provider, ModuleName, CollectionName)
        {
        }

        // --- Domain-specific helpers (compose over IRepository<T>) ---
        public async Task<SessionMessageFeedback> UpsertFeedbackAsync(string userId, Guid messageId, Guid? sessionId, string value, // "like" | "dislike"
     string? note = null, string? source = null)
        {
            // Try find existing feedback for (MessageId, UserId)
            var existing = await FindAsync(f => f.MessageId == messageId && f.UserId == userId);
            if (existing is not null)
            {
                existing.Value = value;
                existing.Note = note;
                existing.Source = source;
                existing.SessionId = sessionId;
                return await UpdateAsync(existing);
            }

            var model = new SessionMessageFeedback
            {
                MessageId = messageId,
                SessionId = sessionId,
                UserId = userId,
                Value = value,
                Note = note,
                Source = source
            };
            return await AddAsync(model);
        }

        public Task RemoveFeedbackAsync(string userId, Guid messageId) => DeleteAsync(f => f.MessageId == messageId && f.UserId == userId);
        public Task<IEnumerable<SessionMessageFeedback>> GetFeedbacksByMessageAsync(Guid messageId, string? userId = null) => string.IsNullOrWhiteSpace(userId) ? FindAllAsync(f => f.MessageId == messageId) : FindAllAsync(f => f.MessageId == messageId && f.UserId == userId);
    }
}
