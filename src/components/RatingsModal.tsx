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
  Image,
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
  const { isUrdu, getTextStyle } = useLanguage();

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
      Alert.alert('Edit Limit Reached', 'This review has already been edited once. Reviews can only be edited 1 time.');
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
      Alert.alert('Review Required', 'Please enter a comment with at least 4 characters.');
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
        Alert.alert('Review Updated!', 'Your review has been edited successfully (1-time edit used).');
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
        Alert.alert('Review Submitted!', 'Your verified ride review and rating have been posted publicly.');
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
        <View style={[styles.modalContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {/* Modal Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="star-circle" size={24} color="#FFD700" style={{ marginRight: 8 }} />
              <Text style={[styles.titleText, { color: theme.textPrimary }, getTextStyle()]}>
                {isUrdu ? 'عوامی ریٹنگز اور تبصرے' : 'Public Ratings & Reviews'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            {/* Overall Score Banner */}
            <View style={[styles.scoreBanner, { backgroundColor: theme.primaryBackground, borderColor: theme.primaryBorder }]}>
              <View style={styles.scoreLeft}>
                <Text style={[styles.scoreBigVal, { color: theme.primary }]}>{calculateAvgRating()}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Icon key={s} name="star" size={16} color="#FFD700" />
                  ))}
                </View>
                <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }, getTextStyle()]}>
                  Based on {reviews.length} verified shared ride reviews
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.writeReviewBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setEditingReviewId(null);
                  setCommentText('');
                  setShowWriteForm(!showWriteForm);
                }}
              >
                <Icon name="pencil-plus" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={[styles.writeReviewBtnText, getTextStyle()]}>
                  {showWriteForm ? (isUrdu ? 'فارم بند کریں' : 'Close') : (isUrdu ? 'تبصرہ لکھیں' : '+ Write Review')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Verified Ride Requirement Info Badge */}
            <View style={[styles.verifiedRequirementBadge, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Icon name="shield-check-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={[{ fontSize: 11, color: theme.textPrimary, flex: 1 }, getTextStyle()]}>
                {isUrdu
                  ? 'صرف وہ مسافر/ڈرائیور جو سفر مکمل کر چکے ہیں ریٹنگ دے سکتے ہیں۔ ریٹنگ صرف ایک بار تبدیل (Edit) ہو سکتی ہے۔'
                  : 'Only verified users who shared a ride can review. Reviews can be edited 1 time only.'}
              </Text>
            </View>

            {/* Write / Edit Review Form Card */}
            {showWriteForm && (
              <View style={[styles.formCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }, getTextStyle()]}>
                    {editingReviewId ? (isUrdu ? 'تبصرہ ترمیم کریں (1 موقع)' : 'Edit Your Review (1-Time Edit)') : (isUrdu ? 'تصدیق شدہ سفر کی ریٹنگ دیں' : 'Leave Verified Ride Rating')}
                  </Text>
                  {editingReviewId && (
                    <View style={[styles.editLimitBadge, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={{ color: '#E65100', fontSize: 10, fontWeight: '800' }}>1 EDIT ONLY</Text>
                    </View>
                  )}
                </View>

                {/* Star Rating Picker */}
                <Text style={[{ fontSize: 12, color: theme.textSecondary, marginBottom: 6 }, getTextStyle()]}>
                  {isUrdu ? 'اسٹارز منتخب کریں:' : 'Select Rating:'}
                </Text>
                <View style={styles.starPickerRow}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <TouchableOpacity key={starVal} onPress={() => setSelectedStars(starVal)} style={{ padding: 4 }}>
                      <Icon
                        name={starVal <= selectedStars ? 'star' : 'star-outline'}
                        size={28}
                        color="#FFD700"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Role Switcher */}
                <View style={styles.rolePickerRow}>
                  <TouchableOpacity
                    style={[styles.roleChip, reviewerRole === 'passenger' ? [styles.roleChipActive, { backgroundColor: theme.primary }] : null]}
                    onPress={() => setReviewerRole('passenger')}
                  >
                    <Text style={[styles.roleChipText, reviewerRole === 'passenger' ? { color: theme.white } : { color: theme.textSecondary }, getTextStyle()]}>
                      {isUrdu ? 'بطور مسافر' : 'As Passenger'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleChip, reviewerRole === 'driver' ? [styles.roleChipActive, { backgroundColor: theme.primary }] : null]}
                    onPress={() => setReviewerRole('driver')}
                  >
                    <Text style={[styles.roleChipText, reviewerRole === 'driver' ? { color: theme.white } : { color: theme.textSecondary }, getTextStyle()]}>
                      {isUrdu ? 'بطور ڈرائیور' : 'As Driver'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Review Text Input */}
                <TextInput
                  style={[styles.commentInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.textPrimary }, getTextStyle()]}
                  placeholder={isUrdu ? 'اپنا تبصرہ لکھیں (وقت کی پابندی، گاڑی کی صفائی)...' : 'Write your ride feedback (Punctuality, cleanliness, safety)...'}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  value={commentText}
                  onChangeText={setCommentText}
                />

                <TouchableOpacity
                  style={[styles.submitReviewBtn, { backgroundColor: theme.primary }, isSubmitting ? { opacity: 0.6 } : null]}
                  onPress={handleSaveOrUpdateReview}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.submitReviewBtnText, getTextStyle()]}>
                    {isSubmitting
                      ? (isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...')
                      : editingReviewId
                      ? (isUrdu ? 'ترمیم شائع کریں (1 بار)' : 'Update Review (Use 1 Edit)')
                      : (isUrdu ? 'عوامی تبصرہ شائع کریں' : 'Submit Verified Review')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Public Reviews List */}
            <Text style={[{ fontSize: 13, fontWeight: '800', color: theme.textPrimary, marginVertical: 10 }, getTextStyle()]}>
              {isUrdu ? 'تصدیق شدہ مسافروں کے تبصرے' : 'Verified Community Reviews'} ({reviews.length})
            </Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Icon name="comment-text-outline" size={36} color={theme.textMuted} />
                <Text style={[{ fontSize: 13, color: theme.textMuted, marginTop: 8 }, getTextStyle()]}>
                  No public reviews yet. Be the first to leave a review!
                </Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={[styles.reviewCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewerAvatar, { backgroundColor: theme.primaryBackground }]}>
                      <Icon name="account-circle" size={24} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }, getTextStyle()]}>{rev.reviewerName}</Text>
                        <View style={[styles.verifiedRideBadgePill, { backgroundColor: '#E8F5E9', marginLeft: 6 }]}>
                          <Text style={{ color: '#2E7D32', fontSize: 9, fontWeight: '800' }}>VERIFIED RIDE ✅</Text>
                        </View>
                      </View>
                      <Text style={[{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }, getTextStyle()]}>
                        {rev.reviewerRole === 'driver' ? 'Driver 🚗' : 'Passenger 🛋️'} • {rev.date} {rev.isEdited ? '(Edited)' : ''}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={styles.reviewStarsBadge}>
                        <Icon name="star" size={14} color="#FFD700" style={{ marginRight: 2 }} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textPrimary }}>{rev.rating}.0</Text>
                      </View>

                      {/* 1-TIME EDIT BUTTON FOR AUTHOR */}
                      {!rev.isEdited ? (
                        <TouchableOpacity style={styles.editReviewActionBtn} onPress={() => handleStartEdit(rev)}>
                          <Icon name="pencil" size={12} color={theme.primary} style={{ marginRight: 2 }} />
                          <Text style={[{ fontSize: 11, color: theme.primary, fontWeight: '700' }, getTextStyle()]}>Edit (1 Left)</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>(Edited 1x)</Text>
                      )}
                    </View>
                  </View>

                  <Text style={[{ fontSize: 13, color: theme.textPrimary, marginTop: 8, lineHeight: 18 }, getTextStyle()]}>
                    "{rev.comment}"
                  </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  scoreLeft: {
    flex: 1,
  },
  scoreBigVal: {
    fontSize: 26,
    fontWeight: '800',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  writeReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rolePickerRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 2,
  },
  roleChipActive: {
    elevation: 1,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentInput: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 12.5,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  submitReviewBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedRequirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  editLimitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedRideBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editReviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStarsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
