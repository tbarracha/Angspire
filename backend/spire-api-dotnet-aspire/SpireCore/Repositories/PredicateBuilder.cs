// File: PredicateBuilder.cs
using System.Linq.Expressions;

namespace SpireCore.Repositories;

/// <summary>
/// Provides expression composition helpers for building dynamic LINQ predicates.
/// </summary>
public static class PredicateBuilder
{
    /// <summary>
    /// Combines two predicates with a logical AND.
    /// </summary>
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var param = left.Parameters[0];
        var replacedRight = new ReplaceParameterVisitor(right.Parameters[0], param).Visit(right.Body)!;
        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(left.Body, replacedRight), param);
    }

    /// <summary>
    /// Combines two predicates with a logical OR.
    /// </summary>
    public static Expression<Func<T, bool>> Or<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var param = left.Parameters[0];
        var replacedRight = new ReplaceParameterVisitor(right.Parameters[0], param).Visit(right.Body)!;
        return Expression.Lambda<Func<T, bool>>(Expression.OrElse(left.Body, replacedRight), param);
    }

    /// <summary>
    /// Returns an expression that always evaluates to true.
    /// Useful as a starting point for dynamic AND chains.
    /// </summary>
    public static Expression<Func<T, bool>> True<T>() => _ => true;

    /// <summary>
    /// Returns an expression that always evaluates to false.
    /// Useful as a starting point for dynamic OR chains.
    /// </summary>
    public static Expression<Func<T, bool>> False<T>() => _ => false;

    private sealed class ReplaceParameterVisitor : ExpressionVisitor
    {
        private readonly ParameterExpression _from;
        private readonly ParameterExpression _to;

        public ReplaceParameterVisitor(ParameterExpression from, ParameterExpression to)
        {
            _from = from;
            _to = to;
        }

        protected override Expression VisitParameter(ParameterExpression node)
            => node == _from ? _to : base.VisitParameter(node);
    }
}
