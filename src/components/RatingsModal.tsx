import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Icon from './AppIcon';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { UserReview, UserProfile } from '../types';
import { getPublicReviewsLocal, savePublicReviewLocal, updatePublicReviewLocal } from '../services/storage';

interface RatingsModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export default function RatingsModal({ visible, onClose, userProfile }: RatingsModalProps) {
  const { theme } = useTheme();
  const { isUrdu, t, getTextStyle } = useLanguage();

  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  // Write / Edit Review Form State
  const [selectedStars, setSelectedStars] = useState(5);
  const [reviewerRole, setReviewerRole] = useState<'passenger' | 'driver'>('passenger');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadReviews();
    }
  }, [visible]);

  const loadReviews = async () => {
    try {
      const data = await getPublicReviewsLocal();
      setReviews(data);
    } catch (e) {
      console.warn('Failed to load reviews', e);
    }
  };

  const calculateAvgRating = () => {
    if (reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleStartEdit = (review: UserReview) => {
    if (review.isEdited) {
      Alert.alert(t('editLimitReached'), t('editLimitReachedDesc'));
      return;
    }
    setEditingReviewId(review.id);
    setSelectedStars(review.rating);
    setReviewerRole(review.reviewerRole);
    setCommentText(review.comment);
    setShowWriteForm(true);
  };

  const handleSaveOrUpdateReview = async () => {
    if (!commentText.trim() || commentText.trim().length < 4) {
      Alert.alert(t('reviewRequiredTitle'), t('reviewRequiredDesc'));
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingReviewId) {
        // UPDATE EXISTING REVIEW ONCE
        await updatePublicReviewLocal(editingReviewId, {
          rating: selectedStars,
          comment: commentText.trim(),
          reviewerRole,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        });
        Alert.alert(t('reviewUpdatedTitle'), t('reviewUpdatedDesc'));
      } else {
        // ADD NEW VERIFIED RIDE REVIEW
        const newReview: UserReview = {
          id: `rev_${Date.now()}`,
          targetUid: userProfile.uid,
          targetName: userProfile.fullName,
          reviewerUid: 'user_current',
          reviewerName: userProfile.fullName || 'Verified Traveler',
          reviewerRole,
          rating: selectedStars,
          comment: commentText.trim(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          createdAt: Date.now(),
          isEdited: false,
          tripVerified: true,
        };

        await savePublicReviewLocal(newReview);
        Alert.alert(t('reviewSubmittedTitle'), t('reviewSubmittedDesc'));
      }

      setCommentText('');
      setEditingReviewId(null);
      setShowWriteForm(false);
      await loadReviews();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.starCircle}>
                <Icon name="star" size={18} color="#2F9A3C" />
              </View>
              <Text style={[styles.titleText, { color: theme.textPrimary }, getTextStyle()]}>
                {t('ratingsAndReviewsTitle')}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.inputBackground }]} onPress={onClose} activeOpacity={0.8}>
              <Icon name="close" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Top Rating Summary Card */}
            <View style={[styles.scoreBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={styles.scoreLeft}>
                <Text style={[styles.scoreBigVal, { color: theme.textPrimary }]}>{calculateAvgRating()}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icon
                      key={star}
                      name="star"
                      size={16}
                      color={star <= Math.round(Number(calculateAvgRating())) ? '#2F9A3C' : theme.border}
                    />
                  ))}
                </View>
                <Text style={[styles.scoreSubText, { color: theme.textSecondary }, getTextStyle()]}>
                  {reviews.length} {t('verifiedRideReviewsCount')}
                </Text>
              </View>

              {!showWriteForm && (
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => {
                    setEditingReviewId(null);
                    setSelectedStars(5);
                    setCommentText('');
                    setShowWriteForm(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Icon name="pencil" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.writeReviewBtnText, getTextStyle()]}>
                    {t('writeReviewBtn')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Write / Edit Review Form Card */}
            {showWriteForm && (
              <View style={[styles.formCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={[styles.formHeading, { color: theme.textPrimary }, getTextStyle()]}>
                  {editingReviewId ? t('editYourReview') : t('writePublicReviewFor')} {userProfile.fullName || 'Driver'}
                </Text>

                <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('rateExperienceStars')}</Text>
                <View style={styles.starPickerRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSelectedStars(s)}
                      style={{ padding: 4 }}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name="star"
                        size={28}
                        color={s <= selectedStars ? '#2F9A3C' : theme.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('iTraveledAs')}</Text>
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleChip,
                      { backgroundColor: theme.inputBackground, borderColor: theme.border },
                      reviewerRole === 'passenger' && styles.roleChipActive,
                    ]}
                    onPress={() => setReviewerRole('passenger')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: theme.textPrimary },
                        reviewerRole === 'passenger' && styles.roleChipTextActive,
                        getTextStyle(),
                      ]}
                    >
                      {t('passenger')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleChip,
                      { backgroundColor: theme.inputBackground, borderColor: theme.border },
                      reviewerRole === 'driver' && styles.roleChipActive,
                    ]}
                    onPress={() => setReviewerRole('driver')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: theme.textPrimary },
                        reviewerRole === 'driver' && styles.roleChipTextActive,
                        getTextStyle(),
                      ]}
                    >
                      {t('driver')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.textSecondary }, getTextStyle()]}>{t('reviewFeedbackLabel')}</Text>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
                  placeholder={t('reviewPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={commentText}
                  onChangeText={setCommentText}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.submitReviewBtn, { flex: 1, backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.border }]}
                    onPress={() => setShowWriteForm(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.submitReviewBtnText, { color: theme.textPrimary }, getTextStyle()]}>
                      {t('cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitReviewBtn, { flex: 2 }]}
                    onPress={handleSaveOrUpdateReview}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.submitReviewBtnText, getTextStyle()]}>
                      {isSubmitting ? t('saving') : editingReviewId ? t('saveChanges') : t('submitVerifiedReview')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* List of Verified Reviews */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }, getTextStyle()]}>
              {t('travelerReviews')} ({reviews.length})
            </Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Icon name="comment-text-multiple-outline" size={36} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }, getTextStyle()]}>
                  {t('noReviewsYet')}
                </Text>
              </View>
            ) : (
              reviews.map((item) => (
                <View key={item.id} style={[styles.reviewCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.reviewerAvatar, { backgroundColor: 'rgba(47, 154, 60, 0.10)' }]}>
                        <Icon name="account" size={18} color="#2F9A3C" />
                      </View>
                      <View>
                        <Text style={[styles.reviewerName, { color: theme.textPrimary }, getTextStyle()]}>
                          {item.reviewerName}
                        </Text>
                        <Text style={[styles.reviewerRoleTag, { color: theme.textSecondary }, getTextStyle()]}>
                          {item.reviewerRole === 'driver' ? t('driver') : t('passenger')} • {t('verifiedRide')}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={styles.reviewStarsBadge}>
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Icon
                            key={st}
                            name="star"
                            size={12}
                            color={st <= item.rating ? '#2F9A3C' : theme.border}
                          />
                        ))}
                      </View>
                      <Text style={[styles.reviewDateText, { color: theme.textSecondary }, getTextStyle()]}>{item.date}</Text>
                    </View>
                  </View>

                  <Text style={[styles.reviewCommentText, { color: theme.textPrimary }, getTextStyle()]}>{item.comment}</Text>

                  {item.reviewerUid === 'user_current' && !item.isEdited && (
                    <TouchableOpacity
                      style={styles.editReviewActionBtn}
                      onPress={() => handleStartEdit(item)}
                      activeOpacity={0.85}
                    >
                      <Icon name="pencil" size={12} color="#2F9A3C" style={{ marginRight: 4 }} />
                      <Text style={[styles.editReviewText, getTextStyle()]}>Edit Review (1 Time)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 42, 39, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
  },
  starCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(47, 154, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262A27',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F2F3F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  scoreLeft: {
    flex: 1,
  },
  scoreBigVal: {
    fontSize: 26,
    fontWeight: '600',
    color: '#262A27',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  scoreSubText: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  writeReviewBtn: {
    backgroundColor: '#2F9A3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  writeReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  formHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#262A27',
    marginTop: 8,
    marginBottom: 4,
  },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  roleChip: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleChipActive: {
    backgroundColor: '#2F9A3C',
    borderColor: '#2F9A3C',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#262A27',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E3',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#262A27',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitReviewBtn: {
    backgroundColor: '#2F9A3C',
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2F9A3C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
    marginVertical: 8,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 12,
    color: '#8A908B',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262A27',
  },
  reviewerRoleTag: {
    fontSize: 10,
    color: '#8A908B',
  },
  reviewDateText: {
    fontSize: 10,
    color: '#8A908B',
    marginTop: 2,
  },
  reviewCommentText: {
    fontSize: 12,
    color: '#262A27',
    lineHeight: 16,
  },
  editReviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editReviewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2F9A3C',
  },
  reviewStarsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
